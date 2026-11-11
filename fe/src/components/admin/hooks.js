"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, errorMessage, isAbort, isRetryable } from "@/lib/api";
import { refreshPublicContent } from "@/lib/revalidate";
import { ADMIN_LOGIN } from "@/config/urls.mjs";
import { useUi } from "./ui";

/** Sự kiện "có thay đổi" → AdminShell / Tổng quan / trang đơn tải lại số đơn, yêu cầu mới */
export const TODO_EVENT = "vl-admin-todo";

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

/*
 * Bộ nhớ tạm dùng chung cho mọi danh sách + ô chọn (điểm đến, chủ đề, chuyên mục…) — "hiện ngay, cập nhật ngầm":
 * - Quay lại trang / bộ lọc đã xem trong 5 phút → hiện NGAY dữ liệu đã có, đồng thời tải lại ngầm (nếu cũ hơn 10 giây)
 *   rồi thay vào khi xong — không hiện khung chờ.
 * - Nhiều nơi cần cùng 1 danh sách cùng lúc → chỉ 1 request (dùng chung request đang chạy).
 * - Xoá sạch sau mỗi thao tác lưu / xoá (useMutation), khi sửa trực tiếp danh sách (setItems) và khi bấm "Tải lại".
 * Chỉ nằm trong bộ nhớ của tab đang mở (không lưu xuống máy), mất khi tải lại trang.
 */
const CACHE_MS = 5 * 60_000;
const FRESH_MS = 10_000;
const CACHE_MAX = 60;
const listCache = new Map();
const inflight = new Map();
let generation = 0; // tăng mỗi lần xoá bộ nhớ → kết quả của request cũ hơn không được ghi lại vào bộ nhớ
export const clearListCache = () => {
  listCache.clear();
  inflight.clear();
  generation++;
};

/** Khoá bộ nhớ: bỏ ô trống + page=1, sắp xếp tham số → "/x?limit=20&sort=a" và "/x?page=1&sort=a&limit=20" là một */
function cacheKey(url) {
  const [path, qs = ""] = url.split("?");
  const p = new URLSearchParams(qs);
  for (const [k, v] of [...p]) if (v === "" || (k === "page" && v === "1")) p.delete(k);
  p.sort();
  const s = p.toString();
  return s ? `${path}?${s}` : path;
}
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

/** Tải 1 danh sách qua API, dùng chung request đang chạy cùng địa chỉ. force → luôn gọi mới. */
function fetchList(url, { force = false } = {}) {
  const key = cacheKey(url);
  if (!force && inflight.has(key)) return inflight.get(key);
  const gen = generation;
  const p = api(url)
    .then((r) => {
      const v = { data: r.data, meta: r.meta ?? null };
      if (gen === generation) cacheSet(key, v.data, v.meta);
      return v;
    })
    .finally(() => {
      if (inflight.get(key) === p) inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

/**
 * Tải trước danh sách (vd. khi di chuột / chạm vào mục menu) → mở trang là có dữ liệu ngay.
 * Bỏ qua nếu dữ liệu còn mới hoặc đang tải. Lỗi bỏ qua im lặng (trang tự tải lại khi mở).
 */
export function prefetchList(url) {
  const key = cacheKey(url);
  const hit = cacheGet(key);
  if ((hit && Date.now() - hit.at < FRESH_MS) || inflight.has(key)) return;
  fetchList(url).catch(() => {});
}

const buildUrl = (path, applied) => {
  const p = new URLSearchParams();
  Object.entries(applied).forEach(([k, v]) => {
    if (v !== "" && v != null) p.set(k, String(v));
  });
  return `${path}?${p.toString()}`;
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
 * - Kết quả của request cũ bị bỏ qua khi có request mới (không bao giờ hiện kết quả cũ đè kết quả mới).
 * - Đã xem trong 5 phút → hiện ngay dữ liệu cũ + tải lại ngầm (xem bộ nhớ tạm ở trên).
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
  // Đã có trong bộ nhớ tạm (vừa xem / vừa tải trước khi di chuột vào menu) → hiện ngay từ lần dựng đầu tiên
  const [state, setState] = useState(() => {
    const hit = cacheGet(
      cacheKey(buildUrl(path, { page: 1, ...initialQuery, ...textOf(initialQuery) })),
    );
    return hit
      ? { items: hit.data, meta: hit.meta, loading: false, error: "" }
      : { items: [], meta: null, loading: true, error: "" };
  });
  const [reloading, setReloading] = useState(false);
  const seq = useRef(0); // lượt tải mới nhất — kết quả của lượt cũ hơn bị bỏ qua
  const background = useRef(false); // đang tải lại ngầm (dữ liệu cũ vẫn hiện)
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

  const url = useMemo(() => buildUrl(path, applied), [path, applied]);

  const load = useCallback(
    async ({ force = false } = {}) => {
      const id = ++seq.current;
      const hit = !force && cacheGet(cacheKey(url));
      if (hit) {
        setState({ items: hit.data, meta: hit.meta, loading: false, error: "" });
        // còn mới → dùng luôn; cũ hơn 10 giây → vẫn hiện ngay, tải lại ngầm rồi thay vào
        if (Date.now() - hit.at < FRESH_MS) return { ok: true, items: hit.data, meta: hit.meta };
      } else setState((s) => ({ ...s, loading: true, error: "" }));
      background.current = Boolean(hit);
      try {
        const r = await fetchList(url, { force });
        if (id !== seq.current) return { aborted: true };
        setState({ items: r.data, meta: r.meta, loading: false, error: "" });
        return { ok: true, items: r.data, meta: r.meta };
      } catch (err) {
        if (id !== seq.current || isAbort(err)) return { aborted: true };
        // tải ngầm lỗi → giữ dữ liệu đang hiện, không báo lỗi
        if (hit) return { ok: true, items: hit.data, meta: hit.meta };
        setState((s) => ({ ...s, loading: false, error: errorMessage(err) }));
        return { ok: false, err };
      } finally {
        if (id === seq.current) background.current = false;
      }
    },
    [url],
  );

  useEffect(() => {
    load();
  }, [load]);
  // rời trang → bỏ qua kết quả còn đang chờ
  useEffect(() => () => void (seq.current += 1), []);

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
    // đang tải lại ngầm → bỏ kết quả đó, không để dữ liệu cũ đè thay đổi vừa làm (kéo thả, ẩn / hiện…)
    if (background.current) {
      seq.current += 1;
      background.current = false;
    }
    setState((s) => ({ ...s, items: fn(s.items) }));
  }, []);

  return { ...state, reloading, query, setQuery, reload, refresh, setItems };
}

/**
 * Lưu / xoá / ẩn hiện + báo website xoá cache (thẻ `tags`) + thông báo kết quả.
 *   const { run, busy } = useMutation(["destinations", "tours"]);
 *   await run(() => api(...), "Đã lưu điểm đến");
 *   await run(fn, "Đã lưu", { retry: () => save() })   // lỗi mạng → thông báo kèm nút "Thử lại"
 *   await run(fn, "Đã lưu", { extraTags: ["settings"] }) // xoá thêm thẻ cho riêng lần này (vd. đổi slug → trang chủ)
 * Hàm này ĐÃ tự thông báo thành công / lỗi — nơi gọi không thông báo thêm.
 */
export function useMutation(tags = []) {
  const { toast } = useUi();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn, success, { retry, errorTitle, extraTags = [] } = {}) => {
      setBusy(true);
      try {
        const result = await fn();
        clearListCache();
        const all = [...tags, ...extraTags];
        if (all.length) await refreshPublicContent(all).catch(() => {});
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

/**
 * Danh sách lựa chọn (điểm đến, chủ đề…) cho ô chọn / bộ lọc. Dùng chung bộ nhớ tạm với useAdminList:
 * trang danh sách tour, form sửa tour, trang chủ… cần cùng danh sách → chỉ tải 1 lần, hiện ngay khi quay lại
 * (cũ hơn 10 giây thì tải lại ngầm). Lưu / xoá bất kỳ (useMutation) → tải mới.
 * useOptionsState: kèm `status` "loading" | "ready" | "error" → phân biệt "đang tải" với "chưa có mục nào".
 */
export function useOptionsState(path, map) {
  const mapRef = useRef(map);
  const [state, setState] = useState(() => {
    const hit = cacheGet(cacheKey(path));
    return hit
      ? { options: hit.data.map(map), status: "ready" }
      : { options: [], status: "loading" };
  });
  useEffect(() => {
    let alive = true;
    const hit = cacheGet(cacheKey(path));
    if (hit) {
      setState({ options: hit.data.map(mapRef.current), status: "ready" });
      if (Date.now() - hit.at < FRESH_MS) return;
    }
    fetchList(path)
      .then((r) => alive && setState({ options: r.data.map(mapRef.current), status: "ready" }))
      .catch(() => alive && !hit && setState({ options: [], status: "error" }));
    return () => {
      alive = false;
    };
  }, [path]);
  return state;
}

export function useOptions(path, map) {
  return useOptionsState(path, map).options;
}
