"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, errorMessage, isAbort, isRetryable } from "@/lib/api";
import { refreshPublicContent } from "@/lib/revalidate";
import { ADMIN_LOGIN } from "@/config/urls.mjs";
import { useUi } from "./ui";
import { TODO_EVENT } from "./AdminShell";

/* =========================================================================
 * Thông báo lỗi chuẩn: bỏ qua request bị huỷ, hết phiên → hướng dẫn rõ, lỗi mạng → nút "Thử lại"
 * ========================================================================= */

export function toastError(toast, err, { retry, title } = {}) {
  if (isAbort(err)) return null;
  if (err?.code === "SESSION_EXPIRED")
    return toast.error(
      "Nội dung đang soạn vẫn còn ở tab này — đăng nhập lại rồi bấm Lưu lần nữa.",
      {
        title: "Phiên đăng nhập đã hết hạn",
        action: {
          label: "Đăng nhập ở tab mới",
          onClick: () => window.open(`${ADMIN_LOGIN}?expired=1`, "_blank", "noopener"),
        },
      },
    );
  return toast.error(errorMessage(err), {
    title,
    action: retry && isRetryable(err) ? { label: "Thử lại", onClick: retry } : undefined,
  });
}

/* =========================================================================
 * Danh sách có lọc / tìm / phân trang
 * ========================================================================= */

// Bộ nhớ tạm kết quả gần đây (~30 giây): quay lại trang / bộ lọc vừa xem → hiện ngay, không gọi lại.
// Xoá sạch sau mỗi thao tác lưu / xoá (useMutation) và khi bấm "Tải lại".
const CACHE_MS = 30_000;
const CACHE_MAX = 40;
const listCache = new Map();
export const clearListCache = () => listCache.clear();
const cacheGet = (key) => {
  const hit = listCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit;
  listCache.delete(key);
  return null;
};
const cacheSet = (key, data, meta) => {
  listCache.delete(key);
  listCache.set(key, { at: Date.now(), data, meta });
  if (listCache.size > CACHE_MAX) listCache.delete(listCache.keys().next().value);
};

const TEXT_KEYS = ["q", "actions"]; // ô gõ chữ → chờ gõ xong mới tìm
const TYPING_MS = 350;
const textOf = (q) =>
  Object.fromEntries(TEXT_KEYS.filter((k) => k in q).map((k) => [k, String(q[k] ?? "").trim()]));
const sameText = (a, b) => TEXT_KEYS.every((k) => (a[k] ?? "") === (b[k] ?? ""));

/**
 * Danh sách có lọc / tìm / phân trang cho trang CMS.
 *   const list = useAdminList("/admin/tours", { q: "", status: "", limit: 20 });
 *   list.items, list.meta, list.loading (đang tải — dữ liệu cũ vẫn giữ để làm mờ), list.reloading (đang bấm Tải lại)
 *   list.query (giá trị ô lọc đang hiện), list.setQuery({ q: "ha" }), list.reload(), list.refresh({ unit: "đơn" })
 * - Ô chữ (q, actions) chờ 350ms sau lần gõ cuối; chọn tab / ô chọn / trang → tải ngay; đổi bộ lọc → về trang 1.
 * - Request cũ bị huỷ khi có request mới (không bao giờ hiện kết quả cũ đè kết quả mới).
 * - Bỏ khoảng trắng thừa; gõ lại đúng chữ đang tìm → không gọi lại.
 */
export function useAdminList(path, initialQuery = {}) {
  const { toast } = useUi();
  const [query, setQueryState] = useState(() => ({ page: 1, ...initialQuery }));
  const queryRef = useRef(query);
  const [applied, setApplied] = useState(() => ({
    page: 1,
    ...initialQuery,
    ...textOf(initialQuery),
  }));
  const [state, setState] = useState({ items: [], meta: null, loading: true, error: "" });
  const [reloading, setReloading] = useState(false);
  const ctrl = useRef(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Gõ xong mới tìm. Xoá trắng ô tìm → áp dụng ngay.
  const typed = textOf(query);
  const typedKey = JSON.stringify(typed);
  useEffect(() => {
    const next = JSON.parse(typedKey);
    if (sameText(next, textOf(applied))) return;
    const empty = Object.values(next).every((v) => !v);
    const t = setTimeout(
      () => {
        setApplied((a) => ({ ...a, ...next, page: 1 }));
        if (queryRef.current.page !== 1) {
          queryRef.current = { ...queryRef.current, page: 1 };
          setQueryState(queryRef.current);
        }
      },
      empty ? 0 : TYPING_MS,
    );
    return () => clearTimeout(t);
  }, [typedKey, applied]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(applied).forEach(([k, v]) => {
      if (v !== "" && v != null) p.set(k, String(v));
    });
    return p.toString();
  }, [applied]);
  const url = `${path}?${qs}`;

  const load = useCallback(
    async ({ force = false } = {}) => {
      ctrl.current?.abort();
      const hit = !force && cacheGet(url);
      if (hit) {
        ctrl.current = null;
        setState({ items: hit.data, meta: hit.meta, loading: false, error: "" });
        return { ok: true, items: hit.data, meta: hit.meta };
      }
      const c = new AbortController();
      ctrl.current = c;
      setState((s) => ({ ...s, loading: true, error: "" }));
      try {
        const r = await api(url, { signal: c.signal });
        if (c.signal.aborted) return { aborted: true };
        cacheSet(url, r.data, r.meta ?? null);
        setState({ items: r.data, meta: r.meta ?? null, loading: false, error: "" });
        return { ok: true, items: r.data, meta: r.meta ?? null };
      } catch (err) {
        if (isAbort(err) || c.signal.aborted) return { aborted: true };
        setState((s) => ({ ...s, loading: false, error: errorMessage(err) }));
        return { ok: false, err };
      } finally {
        if (ctrl.current === c) ctrl.current = null;
      }
    },
    [url],
  );

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => () => ctrl.current?.abort(), []);

  const setQuery = useCallback((patch) => {
    const keys = Object.keys(patch);
    const textOnly = keys.length > 0 && keys.every((k) => TEXT_KEYS.includes(k));
    const next = {
      ...queryRef.current,
      ...patch,
      ...(!textOnly && { page: "page" in patch ? patch.page : 1 }),
    };
    queryRef.current = next;
    setQueryState(next);
    // chữ: chỉ đổi ô hiển thị, việc tìm chờ gõ xong (effect phía trên).
    // Bộ lọc khác: áp dụng ngay, kèm luôn chữ đang gõ dở.
    if (!textOnly) setApplied((a) => ({ ...a, ...next, ...textOf(next) }));
  }, []);

  /** Tải lại (bỏ qua bộ nhớ tạm) */
  const reload = useCallback(() => {
    clearListCache();
    return load({ force: true });
  }, [load]);

  /**
   * Nút "Tải lại" / "Làm mới": nút quay + thông báo kết quả.
   *   list.refresh({ unit: "đơn", fresh: "đơn mới" })  →  "Đã cập nhật danh sách — 12 đơn" / "Có 2 đơn mới"
   * fresh: chỉ dùng cho danh sách chỉ thêm mới (đơn, yêu cầu, nhật ký) → so tổng số trước / sau.
   */
  const refresh = useCallback(
    async ({ unit = "mục", fresh } = {}) => {
      const before = stateRef.current.meta?.total ?? stateRef.current.items.length;
      setReloading(true);
      let pending = null;
      const slow = setTimeout(() => (pending = toast.loading("Đang tải lại danh sách…")), 300);
      const r = await reload();
      clearTimeout(slow);
      setReloading(false);
      if (r.aborted) return pending?.dismiss();
      if (!r.ok) {
        pending?.dismiss();
        return toastError(toast, r.err, {
          title: "Chưa tải lại được danh sách",
          retry: () => refresh({ unit, fresh }),
        });
      }
      const show = pending ?? toast;
      const total = r.meta?.total ?? r.items.length;
      const added = fresh ? total - before : 0;
      if (added > 0)
        return show.success(`Danh sách đã được cập nhật — tổng ${total} ${unit}`, {
          title: `Có ${added} ${fresh}`,
        });
      return show.success(
        total ? `Đã cập nhật danh sách — ${total} ${unit}` : `Đã cập nhật — chưa có ${unit} nào`,
      );
    },
    [reload, toast],
  );

  const setItems = useCallback((fn) => {
    clearListCache();
    setState((s) => ({ ...s, items: fn(s.items) }));
  }, []);

  return { ...state, reloading, query, setQuery, reload, refresh, setItems };
}

/**
 * Lưu / xoá / ẩn hiện + báo website xoá cache (thẻ `tags`) + thông báo kết quả.
 *   const { run, busy } = useMutation(["destinations", "tours"]);
 *   await run(() => api(...), "Đã lưu điểm đến");
 *   await run(fn, "Đã lưu", { retry: () => save() })   // lỗi mạng → thông báo kèm nút "Thử lại"
 * Hàm này ĐÃ tự thông báo thành công / lỗi — nơi gọi không thông báo thêm.
 */
export function useMutation(tags = []) {
  const { toast } = useUi();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn, success, { retry, errorTitle } = {}) => {
      setBusy(true);
      try {
        const result = await fn();
        clearListCache();
        if (tags.length) await refreshPublicContent(tags).catch(() => {});
        if (success) toast(success);
        window.dispatchEvent(new Event(TODO_EVENT));
        return result ?? true;
      } catch (err) {
        toastError(toast, err, { retry, title: errorTitle });
        return null;
      } finally {
        setBusy(false);
      }
    },
    [tags, toast],
  );
  return { run, busy };
}

/** Nạp 1 lần danh sách lựa chọn (điểm đến, chủ đề…) cho ô chọn trong form */
export function useOptions(path, map) {
  const [options, setOptions] = useState([]);
  const mapRef = useRef(map);
  useEffect(() => {
    api(path)
      .then((r) => setOptions(r.data.map(mapRef.current)))
      .catch(() => setOptions([]));
  }, [path]);
  return options;
}
