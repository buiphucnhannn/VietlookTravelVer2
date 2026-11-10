"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { refreshPublicContent } from "@/lib/revalidate";
import { useUi } from "./ui";
import { TODO_EVENT } from "./AdminShell";

/**
 * Danh sách có lọc / tìm / phân trang cho trang CMS.
 *   const list = useAdminList("/admin/destinations", { region: "", q: "" });
 *   list.items, list.meta, list.loading, list.query, list.setQuery({ q: "ha" }), list.reload()
 * Ô tìm kiếm (q) tự trễ 300ms; đổi bộ lọc → về trang 1.
 */
export function useAdminList(path, initialQuery = {}) {
  const [query, setQueryState] = useState({ page: 1, ...initialQuery });
  const [debouncedQ, setDebouncedQ] = useState(query.q ?? "");
  const [state, setState] = useState({ items: [], meta: null, loading: true, error: "" });
  const reqId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.q ?? ""), 300);
    return () => clearTimeout(t);
  }, [query.q]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries({ ...query, q: debouncedQ }).forEach(([k, v]) => {
      if (v !== "" && v != null) p.set(k, String(v));
    });
    return p.toString();
  }, [query, debouncedQ]);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const r = await api(`${path}?${qs}`);
      if (id === reqId.current)
        setState({ items: r.data, meta: r.meta ?? null, loading: false, error: "" });
    } catch (err) {
      if (id === reqId.current)
        setState((s) => ({ ...s, loading: false, error: errorMessage(err) }));
    }
  }, [path, qs]);

  useEffect(() => {
    load();
  }, [load]);

  const setQuery = useCallback(
    (patch) => setQueryState((q) => ({ ...q, ...patch, page: "page" in patch ? patch.page : 1 })),
    [],
  );

  return {
    ...state,
    query,
    setQuery,
    reload: load,
    setItems: (fn) => setState((s) => ({ ...s, items: fn(s.items) })),
  };
}

/**
 * Lưu / xoá / ẩn hiện + báo website xoá cache (thẻ `tags`) + thông báo kết quả.
 *   const { run, busy } = useMutation(["destinations", "tours"]);
 *   await run(() => api(...), "Đã lưu điểm đến");
 */
export function useMutation(tags = []) {
  const { toast } = useUi();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn, success) => {
      setBusy(true);
      try {
        const result = await fn();
        if (tags.length) await refreshPublicContent(tags).catch(() => {});
        if (success) toast(success);
        window.dispatchEvent(new Event(TODO_EVENT));
        return result ?? true;
      } catch (err) {
        toast(errorMessage(err), "error");
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
