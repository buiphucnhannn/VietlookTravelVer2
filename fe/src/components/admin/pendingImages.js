"use client";

/**
 * Ảnh CHỈ được lưu vào kho ảnh của website khi nhân viên bấm Lưu.
 *
 * Chọn ảnh / cắt ảnh / dán link → ảnh (đã cắt, thu nhỏ sẵn) giữ trên máy, ô ảnh hiện ngay bản xem trước.
 * Giá trị trong form là 1 link tạm `blob:…` (đánh dấu "chờ lưu"). Khi bấm Lưu:
 *
 *   const images = usePendingImages(form);          // trong component giữ form
 *   const body = await images.prepare(payload);     // tải mọi ảnh chờ lưu (song song) → thay link thật
 *   if (!body) return;                              // tải lỗi: đã báo lỗi, ảnh vẫn giữ trên máy để bấm Lưu lại
 *   …api(PUT, body)
 *   <Button loading={busy || images.busy}>{images.label || "Lưu"}</Button>   // "Đang tải ảnh 2/5…"
 *
 * `prepare` đi khắp form (object, mảng, chuỗi HTML của bài viết) nên ô ảnh mới thêm vào form tự được xử lý.
 * - Tải song song tối đa 3 ảnh, tự thử lại khi mạng chập chờn / hệ thống bận.
 * - Lưu bản ghi lỗi sau khi ảnh đã tải → bấm Lưu lần nữa dùng lại ảnh đã tải, không tải lại
 *   (máy chủ cũng đặt tên ảnh theo nội dung → có tải lại cũng không sinh file trùng).
 * - Đóng / huỷ form, rời trang mà không lưu → ảnh đã lỡ tải lên (lần Lưu bị lỗi) được bỏ ngay; máy chủ chỉ
 *   xoá ảnh chưa từng được lưu và không còn nơi nào dùng (xem DELETE /uploads/pending).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api, errorMessage } from "@/lib/api";
import { useUi } from "./ui";

/** link tạm → { file (bản sẽ tải lên), original (ảnh gốc, để cắt lại cho nét), folder, at, uploaded?, uploadedAt? } */
const registry = new Map();
const BLOB_RX = /blob:https?:\/\/[^\s"'<>)\\]+/g;
const CONCURRENCY = 3;
const RETRY_DELAYS = [1000, 3000]; // thử lại tối đa 2 lần
/** Ảnh đã tải ở lần Lưu lỗi trước chỉ được dùng lại trong 12 giờ (máy chủ dọn ảnh chưa lưu sau 24 giờ) */
const REUSE_MS = 12 * 3600_000;

export const isPendingImage = (v) => typeof v === "string" && v.startsWith("blob:");

/** Giữ ảnh trên máy, trả về link tạm để hiện xem trước / đặt vào form */
export function addPendingImage(file, { folder = "misc", original } = {}) {
  const url = URL.createObjectURL(file);
  registry.set(url, { file, original: original ?? file, folder, at: Date.now() });
  return url;
}

/** Ảnh gốc của 1 ảnh chờ lưu (để cắt lại từ bản gốc, không cắt chồng lên bản đã cắt) */
export const pendingOriginal = (url) => registry.get(url)?.original ?? null;

const isPlain = (v) =>
  v !== null &&
  typeof v === "object" &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);

/** Mọi link tạm trong form (kể cả nằm trong HTML bài viết) */
export function findPendingImages(value, out = new Set()) {
  if (typeof value === "string") {
    if (value.includes("blob:")) for (const m of value.matchAll(BLOB_RX)) out.add(m[0]);
  } else if (Array.isArray(value)) value.forEach((x) => findPendingImages(x, out));
  else if (isPlain(value)) Object.values(value).forEach((x) => findPendingImages(x, out));
  return out;
}

/** Thay link tạm bằng link thật (giữ nguyên object không đổi) */
function replaceIn(value, map) {
  if (typeof value === "string")
    return value.includes("blob:") ? value.replace(BLOB_RX, (m) => map.get(m) ?? m) : value;
  if (Array.isArray(value)) {
    const next = value.map((x) => replaceIn(x, map));
    return next.some((x, i) => x !== value[i]) ? next : value;
  }
  if (isPlain(value)) {
    let changed = false;
    const next = {};
    for (const [k, v] of Object.entries(value)) {
      next[k] = replaceIn(v, map);
      if (next[k] !== v) changed = true;
    }
    return changed ? next : value;
  }
  return value;
}

/** Lỗi tự hết khi thử lại: mất mạng, quá giờ, hệ thống bận / đang khởi động lại */
const transient = (err) =>
  err instanceof ApiError &&
  (err.status === 0 ||
    err.status === 408 ||
    err.status >= 500 ||
    (err.status === 429 && (err.retryAfter ?? 60) <= 5));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function uploadOne(entry) {
  const fd = new FormData();
  fd.append("files", entry.file);
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await api(`/uploads/images?folder=${encodeURIComponent(entry.folder)}`, {
        method: "POST",
        body: fd,
        timeout: 180_000,
      });
      return r.data[0].url;
    } catch (err) {
      if (attempt >= RETRY_DELAYS.length || !transient(err)) throw err;
      await sleep(RETRY_DELAYS[attempt]);
    }
  }
}

const reusable = (e) => e.uploaded && Date.now() - e.uploadedAt < REUSE_MS;

/**
 * Tải mọi ảnh chờ lưu trong `value` (song song, tối đa 3 ảnh cùng lúc) → bản sao của `value` với link thật.
 * Ảnh đã tải ở lần Lưu trước (lưu bản ghi bị lỗi) không tải lại. Lỗi → ném lỗi dễ hiểu, ảnh vẫn giữ trên máy.
 * @param {(done: number, total: number) => void} [onProgress]
 */
export async function uploadPendingImages(value, { onProgress } = {}) {
  const urls = [...findPendingImages(value)];
  if (!urls.length) return value;
  if (urls.some((u) => !registry.has(u)))
    throw new Error("Có ảnh đã chọn nhưng không còn trên máy — hãy chọn lại ảnh đó rồi bấm Lưu.");
  const todo = urls.filter((u) => !reusable(registry.get(u)));
  let done = urls.length - todo.length;
  onProgress?.(done, urls.length);
  const errors = [];
  const worker = async () => {
    for (let u = todo.shift(); u; u = todo.shift()) {
      const entry = registry.get(u);
      try {
        entry.uploaded = await uploadOne(entry);
        entry.uploadedAt = Date.now();
      } catch (err) {
        errors.push(err);
      }
      onProgress?.(++done, urls.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
  if (errors.length) {
    const bad = errors.find((e) => e instanceof ApiError && e.status === 422);
    const why = errorMessage(bad ?? errors[0]);
    const what = urls.length === 1 ? "Chưa lưu được ảnh." : `Chưa lưu được ${errors.length} ảnh.`;
    throw new Error(
      bad
        ? `${what} ${why} Hãy bỏ ảnh đó, chọn ảnh khác rồi bấm Lưu.`
        : `${what} ${why} Ảnh vẫn còn trong form — bấm Lưu để thử lại.`,
    );
  }
  return replaceIn(value, new Map(urls.map((u) => [u, registry.get(u).uploaded])));
}

/**
 * Báo máy chủ bỏ ảnh / video đã tải lên nhưng không được lưu (máy chủ tự kiểm tra an toàn: chỉ xoá file chưa
 * từng được lưu, không còn nơi nào dùng). Chạy nền, lỗi bỏ qua (lần dọn hằng ngày lo).
 * keepalive: vẫn gửi được khi trang đang đóng.
 */
export function discardUploads(urls) {
  const list = [...new Set(urls)].filter(Boolean);
  for (let i = 0; i < list.length; i += 30)
    api("/uploads/pending", {
      method: "DELETE",
      body: { urls: list.slice(i, i + 30) },
      keepalive: true,
      retry: false,
      timeout: 15_000,
    }).catch(() => {});
}

/** Form của các trình soạn đang mở (để không giải phóng / bỏ ảnh một form khác còn dùng) */
const liveForms = new Set();
const liveText = () => {
  try {
    return JSON.stringify([...liveForms].map((r) => r.current));
  } catch {
    return "";
  }
};

/** Form đang mở còn ảnh vừa chọn mà chưa lưu */
export const hasPendingImages = () =>
  [...liveForms].some((r) => findPendingImages(r.current).size > 0);

/** Câu hỏi "rời trang / đóng khi chưa lưu?" — nhắc thêm nếu có ảnh vừa chọn chưa lưu */
export const unsavedNote = (message) =>
  hasPendingImages() ? `${message} Ảnh vừa chọn cũng chưa được lưu.` : message;

/** Giải phóng link tạm (không tải lên nữa); ảnh đã lỡ tải lên mà không form nào dùng → báo máy chủ bỏ */
export function releasePendingImages(urls) {
  const uploaded = [];
  for (const u of urls) {
    const e = registry.get(u);
    if (!e) continue;
    if (e.uploaded) uploaded.push(e.uploaded);
    registry.delete(u);
    URL.revokeObjectURL(u);
  }
  if (!uploaded.length) return;
  const text = liveText();
  discardUploads(uploaded.filter((x) => !text.includes(x)));
}

// Đóng tab / tải lại trang: bỏ ảnh đã lỡ tải lên (lần Lưu lỗi) mà form không còn dùng
if (typeof window !== "undefined")
  window.addEventListener("pagehide", (e) => {
    if (e.persisted) return; // trang chỉ tạm ẩn (bộ nhớ đệm trình duyệt) → còn quay lại được
    const text = liveText();
    const lost = [...registry.values()]
      .map((x) => x.uploaded)
      .filter((x) => x && !text.includes(x));
    if (lost.length) discardUploads(lost);
  });

/**
 * Dùng trong component giữ form. Khi component đóng (huỷ / lưu xong / chuyển trang): giải phóng ảnh tạm
 * của form này và ảnh tạm chọn trong lúc mở nhưng đã bị thay / bỏ.
 */
export function usePendingImages(form) {
  const { toast } = useUi();
  const [progress, setProgress] = useState(null);
  const formRef = useRef(form);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    const since = Date.now();
    const ref = formRef;
    liveForms.add(ref);
    return () => {
      liveForms.delete(ref);
      const mine = findPendingImages(ref.current);
      for (const [u, e] of registry) if (e.at >= since) mine.add(u);
      const others = new Set();
      for (const r of liveForms) findPendingImages(r.current, others);
      // form vừa lưu xong chứa link thật của ảnh → không bị coi là bỏ (máy chủ cũng tự kiểm tra lại)
      liveForms.add(ref);
      releasePendingImages([...mine].filter((u) => !others.has(u)));
      liveForms.delete(ref);
    };
  }, []);

  const prepare = useCallback(
    async (value) => {
      if (!findPendingImages(value).size) return value;
      setProgress({ done: 0, total: 1 });
      try {
        return await uploadPendingImages(value, {
          onProgress: (done, total) => setProgress({ done, total }),
        });
      } catch (err) {
        toast(errorMessage(err), "error");
        return null;
      } finally {
        setProgress(null);
      }
    },
    [toast],
  );

  const label = progress
    ? progress.total > 1
      ? `Đang tải ảnh ${Math.min(progress.done + 1, progress.total)}/${progress.total}…`
      : "Đang tải ảnh…"
    : "";
  return { prepare, busy: !!progress, label };
}
