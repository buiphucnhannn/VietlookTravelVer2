"use client";

/**
 * BẢN NHÁP TỰ ĐỘNG cho các form dài (tour, bài viết…).
 *
 * Phần đang sửa dở được ghi vào trình duyệt (localStorage) sau mỗi lần ngừng gõ ~0,8 giây → lỡ đóng tab,
 * tải lại trang, hết phiên đăng nhập, máy treo… mở lại trang là được hỏi có khôi phục không.
 *
 *   const draft = useDraft(isNew ? "tour:new" : `tour:${id}`, form, savedJson, {
 *     enabled: canEdit && loaded,      // chỉ người được sửa, sau khi đã tải xong bản đã lưu
 *     dirty,                           // (tuỳ chọn) false → coi như không có thay đổi, xoá bản nháp
 *     updatedAt,                       // (tuỳ chọn) lúc lưu gần nhất trên máy chủ — nháp cũ hơn thì bỏ
 *     serialize: toPayload,            // (tuỳ chọn) chỉ so sánh các trường này với bản đã lưu
 *     onRestore: (data) => setForm(…), // người dùng chọn "Khôi phục"
 *   });
 *   {draft.savedAt && <span>Đã tự lưu bản nháp lúc {draft.savedLabel}</span>}
 *
 * - Ảnh chọn từ máy (link tạm `blob:`) không giữ được qua lần tải lại → bản nháp dùng lại ảnh đã lưu ở ô đó.
 * - Bản nháp tự xoá khi đã lưu xong / khi form trở lại giống bản đã lưu; nháp quá 14 ngày bị bỏ.
 * - Mỗi tài khoản một bản nháp riêng (máy dùng chung nhiều người).
 * - Trình duyệt chặn lưu trữ (ẩn danh, đầy bộ nhớ…) → chỉ mất tính năng bản nháp, form vẫn chạy bình thường.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUi } from "./ui";
import { useCurrentUser } from "./permissions";

const PREFIX = "vl-draft:";
const DEBOUNCE_MS = 800;
const MAX_AGE_MS = 14 * 24 * 3600_000;
/** Khoá nội bộ chỉ dùng để vẽ danh sách (sinh lại mỗi lần tải trang) — không tính là thay đổi */
const IGNORE_KEYS = new Set(["_k"]);
const BLOB_TAG_RX = /<img\b[^>]*blob:[^>]*>/gi;
const BLOB_RX = /blob:https?:\/\/[^\s"'<>)\\]+/g;

const isPlain = (v) =>
  v !== null &&
  typeof v === "object" &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const isBlob = (v) => typeof v === "string" && v.startsWith("blob:");
const hasBlob = (v) =>
  isPlain(v) && Object.values(v).some((x) => typeof x === "string" && isBlob(x));

function readDraft(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    const d = raw ? JSON.parse(raw) : null;
    return d && typeof d.at === "number" && d.data !== undefined ? d : null;
  } catch {
    return null;
  }
}
function writeDraft(storageKey, value) {
  try {
    if (value) localStorage.setItem(storageKey, JSON.stringify(value));
    else localStorage.removeItem(storageKey);
  } catch {
    // trình duyệt chặn lưu trữ / hết chỗ → bỏ qua
  }
}

/** Bỏ ảnh chờ lưu (blob:) — ô ảnh quay về ảnh đã lưu (nếu có), ảnh thêm mới trong danh sách bị bỏ */
function stripBlobs(value, saved) {
  if (typeof value === "string") {
    if (isBlob(value)) return typeof saved === "string" && !isBlob(saved) ? saved : "";
    return value.includes("blob:") ? value.replace(BLOB_TAG_RX, "").replace(BLOB_RX, "") : value;
  }
  if (Array.isArray(value))
    return value.filter((x) => !isBlob(x) && !hasBlob(x)).map((x) => stripBlobs(x));
  if (isPlain(value))
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, stripBlobs(v, saved?.[k])]),
    );
  return value;
}

/** JSON để so sánh: bỏ khoá nội bộ, thứ tự khoá cố định */
function canon(value) {
  return JSON.stringify(value, (k, v) => {
    if (IGNORE_KEYS.has(k)) return undefined;
    if (isPlain(v))
      return Object.fromEntries(
        Object.keys(v)
          .sort()
          .map((key) => [key, v[key]]),
      );
    return v;
  });
}

/** Số ô khác nhau giữa 2 bản (đếm tới từng ô chữ / số; mục thêm / bớt trong danh sách tính 1) */
function countChanges(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    const x = Array.isArray(a) ? a : [];
    const y = Array.isArray(b) ? b : [];
    let n = 0;
    for (let i = 0; i < Math.max(x.length, y.length); i++)
      n += i < x.length && i < y.length ? countChanges(x[i], y[i]) : 1;
    return n;
  }
  if (isPlain(a) || isPlain(b)) {
    const x = isPlain(a) ? a : {};
    const y = isPlain(b) ? b : {};
    let n = 0;
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)]))
      if (!IGNORE_KEYS.has(k)) n += countChanges(x[k], y[k]);
    return n;
  }
  const norm = (v) => (v == null ? "" : v);
  return norm(a) === norm(b) ? 0 : 1;
}

const pad = (n) => String(n).padStart(2, "0");
const hhmm = (t) => {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const ddmm = (t) => {
  const d = new Date(t);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

const parseJson = (s) => {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};

export default function useDraft(
  key,
  value,
  savedJson,
  { enabled = true, dirty, updatedAt, serialize, onRestore } = {},
) {
  const { confirm } = useUi();
  const user = useCurrentUser();
  const uid = user ? user.id || user._id || user.username || "me" : null;
  const storageKey = key && uid ? `${PREFIX}${uid}:${key}` : null;
  const active = Boolean(enabled && storageKey && savedJson != null);

  const [savedAt, setSavedAt] = useState(null);
  // storageKey đã hỏi xong bản nháp cũ → mới bắt đầu ghi (đổi số để chạy lại khi trả lời hộp hỏi xong)
  const ready = useRef(null);
  const [answered, setAnswered] = useState(0);
  const checking = useRef(null); // tránh hỏi 2 lần (StrictMode chạy effect 2 lần)
  const timer = useRef(null);
  const pending = useRef(null); // bản nháp chờ ghi (để ghi ngay khi đóng tab)

  const opts = useRef({ serialize, onRestore, updatedAt, confirm });
  useEffect(() => {
    opts.current = { serialize, onRestore, updatedAt, confirm };
  });

  const ser = useCallback((v) => (opts.current.serialize ? opts.current.serialize(v) : v), []);

  // Mở form: còn bản nháp khác bản đã lưu và mới hơn → hỏi có khôi phục không
  useEffect(() => {
    if (!active || checking.current === storageKey) return;
    checking.current = storageKey;
    const draft = readDraft(storageKey);
    const saved = parseJson(savedJson);
    const savedTime = Date.parse(opts.current.updatedAt ?? "") || 0;
    const n = draft ? countChanges(ser(draft.data), ser(saved)) : 0;
    const usable = draft && n > 0 && Date.now() - draft.at < MAX_AGE_MS && draft.at > savedTime;
    if (!usable) {
      if (draft) writeDraft(storageKey, null);
      ready.current = storageKey; // effect ghi nháp ngay bên dưới chạy sau trong cùng lượt
      return;
    }
    opts.current
      .confirm({
        title: "Khôi phục phần đang sửa dở?",
        message: `Bạn có bản đang sửa dở lúc ${hhmm(draft.at)} ngày ${ddmm(draft.at)} (${n} chỗ khác bản đã lưu). Khôi phục?`,
        confirmText: "Khôi phục",
        cancelText: "Bỏ bản nháp",
      })
      .then((ok) => {
        if (ok) {
          opts.current.onRestore?.(draft.data);
          setSavedAt(draft.at);
        } else writeDraft(storageKey, null);
        ready.current = storageKey;
        setAnswered((n) => n + 1);
      });
  }, [active, storageKey, savedJson, ser]);

  // Ghi bản nháp sau khi ngừng sửa; trở lại giống bản đã lưu / đã lưu xong → xoá
  useEffect(() => {
    if (!active || ready.current !== storageKey) return;
    clearTimeout(timer.current);
    pending.current = null;
    const saved = parseJson(savedJson);
    const same = () =>
      dirty === false || canon(ser(stripBlobs(value, saved))) === canon(ser(saved));
    // (dòng "Đã tự lưu…" chỉ hiện khi còn thay đổi → không cần xoá giờ ở đây)
    if (dirty === false || canon(ser(value)) === canon(ser(saved))) {
      writeDraft(storageKey, null);
      return;
    }
    const write = () => {
      pending.current = null;
      if (same()) {
        writeDraft(storageKey, null);
        setSavedAt(null);
        return;
      }
      const at = Date.now();
      writeDraft(storageKey, { v: 1, at, data: stripBlobs(value, saved) });
      setSavedAt(at);
    };
    pending.current = write;
    timer.current = setTimeout(write, DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
  }, [active, answered, storageKey, value, savedJson, dirty, ser]);

  // Đóng tab / tải lại khi còn bản nháp chờ ghi → ghi ngay
  useEffect(() => {
    const flush = () => pending.current?.();
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  /** Xoá bản nháp ngay (vd. vừa lưu xong và sắp chuyển trang) */
  const clear = useCallback(() => {
    clearTimeout(timer.current);
    pending.current = null;
    if (storageKey) writeDraft(storageKey, null);
    setSavedAt(null);
  }, [storageKey]);

  return useMemo(
    () => ({ savedAt, savedLabel: savedAt ? hhmm(savedAt) : "", clear }),
    [savedAt, clear],
  );
}
