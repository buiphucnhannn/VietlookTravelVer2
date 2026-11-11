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
 * Đóng / huỷ form mà không lưu → không tải gì lên, link tạm được giải phóng.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useUi } from "./ui";

/** link tạm → { file (bản sẽ tải lên), original (ảnh gốc, để cắt lại cho nét), folder, at, uploaded? } */
const registry = new Map();
const BLOB_RX = /blob:https?:\/\/[^\s"'<>)\\]+/g;
const CONCURRENCY = 4;

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

async function uploadOne(entry) {
  const fd = new FormData();
  fd.append("files", entry.file);
  const r = await api(`/uploads/images?folder=${encodeURIComponent(entry.folder)}`, {
    method: "POST",
    body: fd,
    timeout: 180_000,
  });
  return r.data[0].url;
}

/**
 * Tải mọi ảnh chờ lưu trong `value` (song song, tối đa 4 ảnh cùng lúc) → bản sao của `value` với link thật.
 * Ảnh đã tải ở lần Lưu trước (lưu bản ghi bị lỗi) không tải lại. Lỗi → ném lỗi dễ hiểu, ảnh vẫn giữ trên máy.
 * @param {(done: number, total: number) => void} [onProgress]
 */
export async function uploadPendingImages(value, { onProgress } = {}) {
  const urls = [...findPendingImages(value)];
  if (!urls.length) return value;
  if (urls.some((u) => !registry.has(u)))
    throw new Error("Có ảnh đã chọn nhưng không còn trên máy — hãy chọn lại ảnh đó rồi bấm Lưu.");
  const todo = urls.filter((u) => !registry.get(u).uploaded);
  let done = urls.length - todo.length;
  onProgress?.(done, urls.length);
  const errors = [];
  const worker = async () => {
    for (let u = todo.shift(); u; u = todo.shift()) {
      const entry = registry.get(u);
      try {
        entry.uploaded ??= await uploadOne(entry);
      } catch (err) {
        errors.push(err);
      }
      onProgress?.(++done, urls.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
  if (errors.length) {
    const why = errorMessage(errors[0]);
    throw new Error(
      errors.length === 1 && urls.length === 1
        ? why
        : `Còn ${errors.length} ảnh chưa lưu được. ${why} Các ảnh vẫn còn đó — bấm Lưu để thử lại.`,
    );
  }
  return replaceIn(value, new Map(urls.map((u) => [u, registry.get(u).uploaded])));
}

/** Giải phóng link tạm (không tải lên nữa) */
export function releasePendingImages(urls) {
  for (const u of urls) {
    if (!registry.has(u)) continue;
    registry.delete(u);
    URL.revokeObjectURL(u);
  }
}

/** Form của các trình soạn đang mở (để không giải phóng ảnh một form khác còn dùng) */
const liveForms = new Set();

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
      releasePendingImages([...mine].filter((u) => !others.has(u)));
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
