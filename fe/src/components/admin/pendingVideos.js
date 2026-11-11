"use client";

/**
 * Video Google Drive cho banner trang chủ: dán link → website lấy video về NGAY (để lúc bấm Lưu không phải chờ).
 *
 *   const r = copyDriveVideo(link)   → Promise<video>  (dán lại đúng link đang lấy → dùng chung 1 lần lấy)
 *   copyState(link)                  → { status: "running" | "done" | "failed", startedAt, error? } | null
 *   cancelCopy(link)                 → huỷ lần lấy đang chạy (gỡ video / dán link khác)
 *   isUnsavedVideo(url)              → video đã lấy về nhưng chưa bấm Lưu
 *
 *   const videos = usePendingVideos(form, { onReady: save });   // trong component giữ form
 *   videos.copying       form còn video đang chuẩn bị
 *   videos.waitAndSave() bấm Lưu khi video chưa xong → tự lưu ngay khi xong (videos.waiting, videos.cancelWait())
 *   videos.saved(body)   gọi sau khi lưu thành công
 *
 * Video đã lấy về mà KHÔNG được lưu (gỡ video, dán link khác, bỏ thay đổi, đóng trang) → báo máy chủ bỏ ngay
 * (máy chủ chỉ xoá video chưa từng được lưu, không còn nơi nào dùng). Đang lấy dở mà huỷ → máy chủ tự bỏ khi xong.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api, errorMessage } from "@/lib/api";
import { canonicalVideo, parseVideo } from "@/lib/video";
import { discardUploads } from "./pendingImages";

const POLL_MS = 3000;
const MAX_POLLS = 200; // ~10 phút

/** link Drive (đã chuẩn hoá) → lần lấy video */
const copies = new Map();
/** link video đã lấy về nhưng chưa lưu → link Drive gốc */
const unsaved = new Map();

let version = 0;
const listeners = new Set();
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
/** Component vẽ lại khi trạng thái lấy video thay đổi */
export const useVideoCopies = () =>
  useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );

const keyOf = (link) => {
  const s = String(link ?? "").trim();
  return parseVideo(s) ? canonicalVideo(s) : s;
};

const wait = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Đã huỷ", "AbortError"));
    });
  });

export function copyState(link) {
  const c = copies.get(keyOf(link));
  return c ? { status: c.status, startedAt: c.startedAt, error: c.error } : null;
}

export const isUnsavedVideo = (url) => unsaved.has(url);

/** Lấy video Drive về website → { url, poster, … }. Lỗi → ném lỗi với câu dễ hiểu. */
export function copyDriveVideo(link) {
  const key = keyOf(link);
  const running = copies.get(key);
  if (running?.status === "running") return running.promise;
  const controller = new AbortController();
  const entry = { status: "running", startedAt: Date.now(), controller, jobId: null };
  copies.set(key, entry);
  emit();
  entry.promise = (async () => {
    const { signal } = controller;
    try {
      let { data } = await api("/uploads/videos/from-drive", {
        method: "POST",
        body: { url: String(link).trim() },
        timeout: 60_000,
        signal,
      });
      // video lớn: máy chủ lấy tiếp ở nền → hỏi lại vài giây một lần
      entry.jobId = data.jobId ?? null;
      for (let i = 0; data.status === "pending" && i < MAX_POLLS; i++) {
        await wait(POLL_MS, signal);
        data = (await api(`/uploads/videos/from-drive/${entry.jobId}`, { signal })).data;
      }
      if (data.status !== "done")
        throw new Error(
          "Chuẩn bị video quá lâu — hãy thử lại, hoặc đăng lên YouTube rồi dán link.",
        );
      entry.jobId = null;
      if (copies.get(key) !== entry) {
        discardUploads([data.video.url]); // đã bị huỷ đúng lúc vừa xong
        throw new DOMException("Đã huỷ", "AbortError");
      }
      unsaved.set(data.video.url, key);
      entry.status = "done";
      entry.video = data.video;
      emit();
      return data.video;
    } catch (err) {
      if (err?.name !== "AbortError" && copies.get(key) === entry) {
        entry.status = "failed";
        entry.error = errorMessage(err);
        emit();
      }
      throw err;
    }
  })();
  entry.promise.catch(() => {});
  return entry.promise;
}

/** Huỷ lần lấy video đang chạy (máy chủ tự bỏ video nếu đã lấy xong) */
export function cancelCopy(link) {
  const key = keyOf(link);
  const entry = copies.get(key);
  if (!entry) return;
  copies.delete(key);
  if (entry.status === "running") {
    entry.controller.abort();
    if (entry.jobId)
      api(`/uploads/videos/from-drive/${entry.jobId}`, {
        method: "DELETE",
        keepalive: true,
        retry: false,
      }).catch(() => {});
  }
  emit();
}

/** Bỏ video đã lấy về mà chưa lưu */
export function discardVideos(urls) {
  const list = urls.filter((u) => unsaved.has(u));
  if (!list.length) return;
  for (const u of list) {
    copies.delete(unsaved.get(u));
    unsaved.delete(u);
  }
  discardUploads(list);
  emit();
}

const liveForms = new Set();
const textOf = (v) => {
  try {
    return JSON.stringify(v) ?? "";
  } catch {
    return "";
  }
};

/** Đóng tab / tải lại trang: huỷ video đang lấy, bỏ video đã lấy mà chưa lưu */
if (typeof window !== "undefined")
  window.addEventListener("pagehide", (e) => {
    if (e.persisted) return;
    [...copies.keys()].forEach(cancelCopy);
    discardVideos([...unsaved.keys()]);
  });

/** Form còn video Drive đang chuẩn bị (hoặc vừa xong nhưng chưa kịp vào form) */
function copyingIn(text) {
  for (const [key, c] of copies)
    if ((c.status === "running" || c.status === "done") && text.includes(key)) return true;
  return false;
}

/**
 * Dùng trong component giữ form có video Drive.
 * @param {unknown} form
 * @param {{ onReady?: () => void }} opts onReady: hàm Lưu — gọi lại khi đang chờ video mà video đã xong
 */
export function usePendingVideos(form, { onReady } = {}) {
  useVideoCopies();
  const formRef = useRef(form);
  const readyRef = useRef(onReady);
  const [waiting, setWaiting] = useState(false);
  const text = textOf(form);
  const copying = copyingIn(text);

  useEffect(() => {
    formRef.current = form;
    readyRef.current = onReady;
  });

  // Video đã lấy về rồi bị gỡ / thay / bỏ thay đổi → bỏ luôn (chờ chút: có thể chỉ đang đổi chỗ trong form)
  useEffect(() => {
    if (!unsaved.size) return;
    const t = setTimeout(() => {
      const all = [...liveForms].map((r) => textOf(r.current)).join("\n");
      discardVideos([...unsaved.keys()].filter((u) => !all.includes(u)));
    }, 1500);
    return () => clearTimeout(t);
  }, [text]);

  // Đóng trang soạn mà không lưu → bỏ video đã lấy về, huỷ video đang lấy
  useEffect(() => {
    const ref = formRef;
    liveForms.add(ref);
    return () => {
      liveForms.delete(ref);
      const others = [...liveForms].map((r) => textOf(r.current)).join("\n");
      const mine = textOf(ref.current);
      for (const key of [...copies.keys()])
        if (mine.includes(key) && !others.includes(key)) cancelCopy(key);
      discardVideos([...unsaved.keys()].filter((u) => mine.includes(u) && !others.includes(u)));
    };
  }, []);

  // Đang chờ video để lưu: video xong (form đã có video) → lưu luôn; video lỗi → hàm Lưu tự báo lỗi
  useEffect(() => {
    if (!waiting || copying) return;
    const t = setTimeout(() => {
      setWaiting(false);
      readyRef.current?.();
    }, 0);
    return () => clearTimeout(t);
  }, [waiting, copying]);

  const saved = useCallback((body) => {
    const t = textOf(body);
    let changed = false;
    for (const [u, key] of [...unsaved]) {
      if (!t.includes(u)) continue;
      unsaved.delete(u);
      copies.delete(key);
      changed = true;
    }
    if (changed) emit();
  }, []);

  return {
    copying,
    waiting: waiting && copying,
    waitAndSave: () => setWaiting(true),
    cancelWait: () => setWaiting(false),
    saved,
  };
}
