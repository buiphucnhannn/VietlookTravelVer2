/**
 * Tính nội dung các ô của 1 trang (registry.mjs) — dùng chung cho website (server) và CMS (trình duyệt).
 *
 * Thuật ngữ:
 *   - entry   : khai báo 1 trang trong PAGE_COPY ({ fields })
 *   - data    : bản đã lưu trong CMS (thưa: ô chưa sửa không có / để trống)
 *   - ctx     : nguồn câu mặc định của 1 ngôn ngữ — { dict: từ điển ngôn ngữ đó, data: { visa: module… } }
 *   - defaults: giá trị mặc định của mọi ô theo 1 ngôn ngữ (chuỗi / mảng), cùng hình dạng với kết quả
 * Không import gì → backend test đọc được trực tiếp.
 */

export const LANGS = ["en", "zh", "vi"];

const isObj = (v) => v != null && typeof v === "object" && !Array.isArray(v);
const str = (v) => (typeof v === "string" ? v : "");
const filled = (v) => typeof v === "string" && v.trim() !== "";

/** Object dạng { en, zh, vi } (chỉ có khoá ngôn ngữ) */
export const isLocalized = (v) =>
  isObj(v) && Object.keys(v).length > 0 && Object.keys(v).every((k) => LANGS.includes(k));

/** { en, zh, vi } → chữ đúng ngôn ngữ (thiếu thì en → vi → zh, giống tr() của website); giá trị khác giữ nguyên */
export function pickLang(v, lang) {
  if (!isLocalized(v)) return v;
  for (const l of [...new Set([lang, "en", "vi", "zh"])]) {
    const x = v[l];
    if (Array.isArray(x) ? x.length : filled(x)) return x;
  }
  return v[lang] ?? v.en;
}

/** Đi theo đường dẫn "a.b.0.c"; gặp { en, zh, vi } giữa đường thì chọn đúng ngôn ngữ */
function walkPath(root, path, lang) {
  let node = pickLang(root, lang);
  for (const k of String(path).split(".").filter(Boolean)) {
    if (node == null) return undefined;
    node = pickLang(node[k], lang);
  }
  return node;
}

/** Giá trị gốc của 1 nguồn mặc định (xem hướng dẫn ở registry.mjs) */
export function sourceOf(def, ctx, lang) {
  if (def == null) return undefined;
  if (typeof def !== "string") return pickLang(def, lang); // mảng / object cố định
  if (def.startsWith("/")) return def; // ảnh có sẵn
  if (def.startsWith("data:")) {
    const [name, ...rest] = def.slice(5).split(".");
    return walkPath(ctx?.data?.[name], rest.join("."), lang);
  }
  return walkPath(ctx?.dict, def, lang);
}

/** Tên các nguồn "data:<tên>" 1 trang cần (để chỉ tải đúng file dữ liệu cần thiết) */
export function dataSourcesOf(entry) {
  const names = new Set();
  const visit = (spec) => {
    if (typeof spec?.def === "string" && spec.def.startsWith("data:"))
      names.add(spec.def.slice(5).split(".")[0]);
    if (spec?.type === "list")
      (spec.item.type ? [spec.item] : Object.values(spec.item)).forEach(visit);
  };
  Object.values(entry?.fields ?? {}).forEach(visit);
  return [...names];
}

/* ---------- Mặc định ---------- */

function defaultValue(spec, raw, ctx, lang) {
  if (spec.type === "list") {
    const arr = Array.isArray(raw) ? raw : [];
    return Array.from({ length: spec.count }, (_, i) => {
      const at = pickLang(arr[i], lang);
      if (spec.item.type)
        return defaultValue(
          spec.item,
          spec.item.def != null ? sourceOf(spec.item.def, ctx, lang) : at,
          ctx,
          lang,
        );
      return Object.fromEntries(
        Object.entries(spec.item).map(([k, s]) => [
          k,
          defaultValue(
            s,
            s.def != null ? sourceOf(s.def, ctx, lang) : pickLang(at?.[s.from ?? k], lang),
            ctx,
            lang,
          ),
        ]),
      );
    });
  }
  return str(pickLang(raw, lang));
}

/** Giá trị mặc định của mọi ô (1 ngôn ngữ) — đúng như website đang hiện khi chưa ai sửa */
export function pageDefaults(entry, ctx, lang) {
  return Object.fromEntries(
    Object.entries(entry.fields).map(([k, spec]) => [
      k,
      defaultValue(spec, sourceOf(spec.def, ctx, lang), ctx, lang),
    ]),
  );
}

/* ---------- Khối bật / tắt trên website ---------- */

/**
 * Cờ ẩn khối đã lưu (`data.hidden`) → chỉ các khối đang tắt, đúng khoá trang cho phép (entry.hideable —
 * lib/hidden-blocks.mjs): { faq: true, … }. Trang không có khối tắt được → {}.
 */
export const hiddenOf = (entry, data) =>
  Object.fromEntries(
    (entry?.hideable ?? []).filter((k) => data?.hidden?.[k] === true).map((k) => [k, true]),
  );

/** Thêm `hidden` vào kết quả khi trang có khối tắt được (trang khác giữ nguyên hình dạng như cũ) */
const withHidden = (entry, data, out) =>
  entry?.hideable ? { ...out, hidden: hiddenOf(entry, data) } : out;

/* ---------- Website: bản đã sửa đè lên mặc định ---------- */

function overlay(spec, node, def, lang) {
  if (spec.type === "list")
    return def.map((d, i) => {
      const n = Array.isArray(node) ? node[i] : undefined;
      if (spec.item.type) return overlay(spec.item, n, d, lang);
      return Object.fromEntries(
        Object.entries(spec.item).map(([k, s]) => [
          k,
          overlay(s, isObj(n) ? n[k] : undefined, d[k], lang),
        ]),
      );
    });
  if (spec.type === "image") return filled(node) ? node.trim() : def;
  const v = isObj(node) ? node[lang] : undefined;
  return filled(v) ? v.trim() : def;
}

/**
 * Nội dung dùng thật trên website cho 1 ngôn ngữ: ô đã sửa (đúng ngôn ngữ đó) đè lên mặc định.
 * Kết quả: { heroTitle: "…", services: [{ title, text }…], heroImage: "/images/…" … }
 */
export function resolvePage(entry, data, ctx, lang) {
  const defs = pageDefaults(entry, ctx, lang);
  const d = isObj(data) ? data : {};
  return withHidden(
    entry,
    d,
    Object.fromEntries(
      Object.entries(entry.fields).map(([k, spec]) => [k, overlay(spec, d[k], defs[k], lang)]),
    ),
  );
}

/**
 * Lấy 1 ô bất kỳ từ bản đã lưu theo đường dẫn ("heroTitle", "faq.2.q"): ô 3 ngôn ngữ → đúng `lang`,
 * ảnh → chuỗi; còn trống → `fallback`. Dùng khi cần lấy lẻ 1 ô mà không qua resolvePage.
 */
export function pick(copy, path, lang, fallback = "") {
  let node = copy;
  for (const k of String(path).split(".")) node = node?.[k];
  if (isLocalized(node)) return filled(node[lang]) ? node[lang].trim() : fallback;
  return filled(node) ? node.trim() : fallback;
}

/* ---------- CMS: dữ liệu soạn thảo ---------- */

/** Duyệt song song khai báo + mặc định 3 ngôn ngữ ({ en, zh, vi }) + 1 nhánh dữ liệu; `leaf` xử lý ô lá */
function walk(spec, defs, node, leaf) {
  if (spec.type === "list")
    return Array.from({ length: spec.count }, (_, i) => {
      const d = Object.fromEntries(LANGS.map((l) => [l, defs[l]?.[i]]));
      const n = Array.isArray(node) ? node[i] : undefined;
      if (spec.item.type) return walk(spec.item, d, n, leaf);
      return Object.fromEntries(
        Object.entries(spec.item).map(([k, s]) => [
          k,
          walk(
            s,
            Object.fromEntries(LANGS.map((l) => [l, d[l]?.[k]])),
            isObj(n) ? n[k] : undefined,
            leaf,
          ),
        ]),
      );
    });
  return leaf(spec, defs, node);
}

const perField = (entry, defsByLang, data, leaf) =>
  Object.fromEntries(
    Object.entries(entry.fields).map(([k, spec]) => [
      k,
      walk(spec, Object.fromEntries(LANGS.map((l) => [l, defsByLang[l]?.[k]])), data?.[k], leaf),
    ]),
  );

/**
 * Bản đã lưu → dữ liệu đang soạn: mọi ô đủ 3 ngôn ngữ, ô chưa sửa điền sẵn câu / ảnh mặc định
 * (nhân viên thấy đúng chữ đang hiện trên website). `defsByLang`: { en, zh, vi } = pageDefaults từng ngôn ngữ.
 */
export const fillPage = (entry, data, defsByLang) =>
  withHidden(
    entry,
    data,
    perField(entry, defsByLang, isObj(data) ? data : {}, (spec, defs, node) =>
      spec.type === "image"
        ? filled(node)
          ? node.trim()
          : str(defs.en)
        : Object.fromEntries(LANGS.map((l) => [l, filled(node?.[l]) ? node[l] : str(defs[l])])),
    ),
  );

const cleanText = (v, multiline) => {
  const s = str(v).replace(/\r\n?/g, "\n");
  return (multiline ? s : s.replace(/\s*\n\s*/g, " ")).trim();
};

/** Ô lá trống (chưa sửa) */
const emptyLeaf = (v) => (typeof v === "string" ? !v : isObj(v) && LANGS.every((l) => !v[l]));

/** Bỏ phần trống cuối mảng / ô trống → bản lưu gọn (ô không có = dùng mặc định) */
function compact(spec, v) {
  if (spec.type === "list") {
    const items = v.map((x) =>
      spec.item.type
        ? emptyLeaf(x)
          ? spec.item.type === "image"
            ? ""
            : {}
          : x
        : Object.fromEntries(Object.entries(x).filter(([k]) => !emptyLeaf(x[k]))),
    );
    // "" (ảnh trống) và {} (ô chữ trống) đều không có khoá nào → bỏ khỏi cuối danh sách
    while (items.length && Object.keys(items.at(-1) ?? {}).length === 0) items.pop();
    return items.length ? items : undefined;
  }
  return emptyLeaf(v) ? undefined : v;
}

/**
 * Dữ liệu đang soạn → bản gửi lên máy chủ: chữ / ảnh giống hệt mặc định thì bỏ (website tiếp tục dùng mặc
 * định, kể cả khi sau này câu mặc định trong từ điển thay đổi). Chỉ còn lại các ô đã sửa.
 */
export function stripPage(entry, state, defsByLang) {
  const raw = perField(entry, defsByLang, state, (spec, defs, node) => {
    if (spec.type === "image") {
      const v = str(node).trim();
      return v === str(defs.en).trim() ? "" : v;
    }
    const multiline = spec.type === "para";
    return Object.fromEntries(
      LANGS.map((l) => {
        const v = cleanText(node?.[l], multiline);
        return [l, v === cleanText(defs[l], multiline) ? "" : v];
      }),
    );
  });
  const out = {};
  for (const [k, spec] of Object.entries(entry.fields)) {
    const v = compact(spec, raw[k]);
    if (v !== undefined) out[k] = v;
  }
  // khối đang tắt trên website (không tắt khối nào → không gửi)
  const hidden = hiddenOf(entry, state);
  if (Object.keys(hidden).length) out.hidden = hidden;
  return out;
}

/** Số ô đã sửa trong 1 bản đã lưu (mỗi ô chữ / ảnh / ô con của danh sách tính 1) */
export function countEdited(entry, data) {
  if (!entry || !isObj(data)) return 0;
  let n = 0;
  const visit = (spec, node) => {
    if (spec.type === "list") {
      if (!Array.isArray(node)) return;
      node.forEach((x) => {
        if (spec.item.type) visit(spec.item, x);
        else Object.entries(spec.item).forEach(([k, s]) => visit(s, isObj(x) ? x[k] : undefined));
      });
      return;
    }
    if (spec.type === "image" ? filled(node) : isObj(node) && LANGS.some((l) => filled(node[l])))
      n++;
  };
  Object.entries(entry.fields).forEach(([k, spec]) => visit(spec, data[k]));
  return n + Object.keys(hiddenOf(entry, data)).length; // mỗi khối đang tắt tính 1
}

/** Khai báo của ô theo đường dẫn ("faq.2.q" → ô q của danh sách faq) — CMS dùng để lấy nhãn, độ dài tối đa */
export function specAt(entry, path) {
  const [head, ...rest] = String(path).split(".");
  let spec = entry?.fields?.[head];
  for (const k of rest) {
    if (!spec) return null;
    if (spec.type === "list") {
      if (!/^\d+$/.test(k)) return null;
      spec = spec.item.type ? spec.item : { type: "item", item: spec.item };
    } else if (spec.type === "item") spec = spec.item[k];
    else return null;
  }
  return spec?.type === "item" ? null : (spec ?? null);
}
