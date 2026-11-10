"use client";

import { useCallback, useRef, useState } from "react";
import { Languages } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button, LANGS, Modal, useUi } from "./ui";

/**
 * DỊCH TỰ ĐỘNG cho mọi form nội dung 3 ngôn ngữ.
 *
 *   <AutoTranslate lang={lang} value={form} onChange={setForm} />
 *
 * `value` là CẢ dữ liệu form (hoặc một phần). Nút tự tìm mọi ô 3 ngôn ngữ bên trong — tức mọi object có
 * khoá thuộc { en, zh, vi } (vd title: { en, zh, vi } hoặc content: { en: {...}, zh: {...}, vi: {...} }) —
 * rồi dịch từ ngôn ngữ đang chọn (`lang`) sang 2 ngôn ngữ còn lại.
 * Không dịch: đường dẫn, link, ảnh, video, mã, số, và các khoá trong SKIP_KEYS / `skipKeys`.
 */

const LANG_KEYS = ["en", "zh", "vi"];
const LANG_NAME = { en: "tiếng Anh", zh: "tiếng Trung", vi: "tiếng Việt" };

const SKIP_KEYS = new Set([
  "slug",
  "id",
  "_id",
  "code",
  "key",
  "url",
  "href",
  "link",
  "image",
  "images",
  "cover",
  "gallery",
  "photo",
  "photos",
  "avatar",
  "icon",
  "video",
  "videos",
  "videoLink",
  "poster",
  "posterMobile",
  "meals",
  "email",
  "phone",
  "publicId",
  "canonical",
  "ogImage",
]);

const isPlain = (v) => v != null && typeof v === "object" && !Array.isArray(v);
const isLocalized = (v) => {
  if (!isPlain(v)) return false;
  const keys = Object.keys(v);
  return keys.length > 0 && keys.every((k) => LANG_KEYS.includes(k));
};
const translatable = (s) =>
  typeof s === "string" &&
  /\p{L}/u.test(s) &&
  !/^(https?:\/\/|\/|mailto:|tel:|#)\S*$/i.test(s.trim()) &&
  !/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(s.trim());
const isEmpty = (v) =>
  v == null ||
  v === "" ||
  (typeof v === "string" && !v.replace(/<[^>]*>/g, "").trim()) ||
  (Array.isArray(v) && v.length === 0) ||
  (isPlain(v) && Object.values(v).every(isEmpty));

/**
 * Tạo bản đích từ bản nguồn: `src` (nội dung ngôn ngữ nguồn), `dst` (nội dung hiện có của ngôn ngữ đích).
 * Chuỗi cần dịch → đẩy vào `jobs` và đặt chỗ; sau khi có bản dịch thì điền vào.
 * overwrite = false: chỉ điền chỗ đích đang trống.
 */
function plan(src, dst, key, ctx) {
  if (key && ctx.skip.has(key)) return dst === undefined ? src : dst;
  if (typeof src === "string") {
    if (!ctx.overwrite && !isEmpty(dst)) return dst;
    if (!translatable(src)) return isEmpty(dst) ? src : dst;
    const slot = { __job: ctx.jobs.length };
    ctx.jobs.push(src);
    return slot;
  }
  if (Array.isArray(src)) {
    const dstArr = Array.isArray(dst) ? dst : [];
    // danh sách đích khác độ dài mà không ghi đè → giữ nguyên bản đích (người dùng đã tự soạn)
    if (!ctx.overwrite && dstArr.length && dstArr.length !== src.length) return dst;
    return src.map((item, i) => plan(item, dstArr[i], key, ctx));
  }
  if (isPlain(src)) {
    const base = isPlain(dst) ? dst : {};
    const out = { ...base };
    for (const k of Object.keys(src)) out[k] = plan(src[k], base[k], k, ctx);
    return out;
  }
  // số, boolean, null: không dịch — đích trống thì lấy theo nguồn
  return dst === undefined || dst === null ? src : dst;
}

function fill(node, done) {
  if (isPlain(node) && "__job" in node) return done[node.__job];
  if (Array.isArray(node)) return node.map((x) => fill(x, done));
  if (isPlain(node))
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, fill(v, done)]));
  return node;
}

/** Duyệt cây dữ liệu, với mỗi ô 3 ngôn ngữ thì lên kế hoạch dịch from → target */
function walk(node, key, from, target, ctx) {
  if (key && ctx.skip.has(key)) return node;
  if (isLocalized(node)) {
    if (isEmpty(node[from])) return node;
    return { en: "", zh: "", vi: "", ...node, [target]: plan(node[from], node[target], null, ctx) };
  }
  if (Array.isArray(node)) return node.map((x) => walk(x, null, from, target, ctx));
  if (isPlain(node))
    return Object.fromEntries(
      Object.entries(node).map(([k, v]) => [k, walk(v, k, from, target, ctx)]),
    );
  return node;
}

const MAX_TEXTS = 300;
const MAX_CHARS = 150_000;

async function translateTexts(from, to, texts) {
  const out = new Array(texts.length);
  let start = 0;
  while (start < texts.length) {
    let end = start;
    let chars = 0;
    while (
      end < texts.length &&
      end - start < MAX_TEXTS &&
      chars + texts[end].length <= MAX_CHARS
    ) {
      chars += texts[end].length;
      end++;
    }
    if (end === start) end = start + 1;
    const r = await api("/translate", {
      method: "POST",
      body: { from, to: [to], texts: texts.slice(start, end) },
      timeout: 120_000,
    });
    r.data[to].forEach((t, i) => (out[start + i] = t));
    start = end;
  }
  return out;
}

/**
 * Dịch mọi ô 3 ngôn ngữ trong `value` từ `from` sang các ngôn ngữ còn lại.
 * Trả { value: dữ liệu mới, count: số đoạn đã dịch }.
 */
export async function translateTree(value, from, { overwrite = false, skipKeys = [] } = {}) {
  const skip = new Set([...SKIP_KEYS, ...skipKeys]);
  let next = value;
  let count = 0;
  for (const target of LANG_KEYS.filter((l) => l !== from)) {
    const ctx = { jobs: [], overwrite, skip };
    const planned = walk(next, null, from, target, ctx);
    if (!ctx.jobs.length) continue;
    const done = await translateTexts(from, target, ctx.jobs);
    next = fill(planned, done);
    count += ctx.jobs.length;
  }
  return { value: next, count };
}

/* -------------------------------------------------------------------------
 * TỰ DỊCH KHI LƯU — nhân viên chỉ cần viết 1 ngôn ngữ bất kỳ.
 * ------------------------------------------------------------------------- */

const textLen = (v) =>
  typeof v === "string"
    ? v.replace(/<[^>]*>/g, "").trim().length
    : Array.isArray(v)
      ? v.reduce((n, x) => n + textLen(x), 0)
      : isPlain(v)
        ? Object.values(v).reduce((n, x) => n + textLen(x), 0)
        : 0;

/** Lượng chữ của từng ngôn ngữ trong mọi ô 3 ngôn ngữ của `value` → { en, zh, vi } */
function measure(value, skip) {
  const out = { en: 0, zh: 0, vi: 0 };
  const go = (node, key) => {
    if (key && skip.has(key)) return;
    if (isLocalized(node)) {
      for (const l of LANG_KEYS) out[l] += textLen(node[l]);
      return;
    }
    if (Array.isArray(node)) node.forEach((x) => go(x, null));
    else if (isPlain(node)) Object.entries(node).forEach(([k, v]) => go(v, k));
  };
  go(value, null);
  return out;
}

/**
 * Điền các ngôn ngữ còn trống bằng bản dịch (KHÔNG ghi đè chữ đã có).
 * Nguồn dịch: ngôn ngữ `prefer` (tab đang chọn) nếu có chữ, rồi tới ngôn ngữ có nhiều chữ nhất…
 * — nên ô nào chỉ có ở 1 ngôn ngữ bất kỳ cũng được dịch sang 2 ngôn ngữ kia.
 * Trả { value, filled: ["en", "zh"] (ngôn ngữ vừa được điền), count }.
 */
export async function fillMissingLanguages(value, { prefer, skipKeys = [] } = {}) {
  const skip = new Set([...SKIP_KEYS, ...skipKeys]);
  const size = measure(value, skip);
  const sources = [...LANG_KEYS]
    .filter((l) => size[l] > 0)
    .sort((a, b) => (b === prefer) - (a === prefer) || size[b] - size[a]);
  let next = value;
  let count = 0;
  const filled = new Set();
  let errors = 0;
  for (const from of sources) {
    for (const target of LANG_KEYS.filter((l) => l !== from)) {
      const ctx = { jobs: [], overwrite: false, skip };
      const planned = walk(next, null, from, target, ctx);
      if (!ctx.jobs.length) continue;
      let done;
      try {
        done = await translateTexts(from, target, ctx.jobs);
      } catch {
        // 1 ngôn ngữ lỗi → vẫn giữ phần đã dịch được của ngôn ngữ kia
        errors++;
        continue;
      }
      next = fill(planned, done);
      count += ctx.jobs.length;
      filled.add(target);
    }
  }
  if (errors && !count) throw new Error("translate failed");
  return {
    value: next,
    filled: LANG_KEYS.filter((l) => filled.has(l)),
    count,
    partial: errors > 0,
  };
}

/** Ngôn ngữ nguồn để tự dịch: `prefer` (tab đang chọn) nếu đã có chữ, không thì ngôn ngữ nhiều chữ nhất */
export function pickSource(value, prefer, skipKeys = []) {
  const size = measure(value, new Set([...SKIP_KEYS, ...skipKeys]));
  if (prefer && size[prefer] > 0) return prefer;
  return [...LANG_KEYS].sort((a, b) => size[b] - size[a])[0];
}

/** Còn ô nào trống ở 1 ngôn ngữ trong khi ngôn ngữ khác đã có chữ (tức là cần dịch) không */
export function needsFill(value, skipKeys = []) {
  const skip = new Set([...SKIP_KEYS, ...skipKeys]);
  return LANG_KEYS.some((from) =>
    LANG_KEYS.some((target) => {
      if (from === target) return false;
      const ctx = { jobs: [], overwrite: false, skip };
      walk(value, null, from, target, ctx);
      return ctx.jobs.length > 0;
    }),
  );
}

const namesOf = (langs) => langs.map((l) => LANG_NAME[l]).join(" và ");

/**
 * Dùng trong nút Lưu của mọi form nhiều ngôn ngữ:
 *
 *   const autoFill = useAutoFill();
 *   const { value, failed } = await autoFill.fill(form, { lang, skipKeys });   // trước khi lưu
 *   …lưu `value`…
 *   if (failed) autoFill.offerRetry((translated) => lưuLại(translated));       // sau khi lưu
 *
 * - Còn ô trống ở ngôn ngữ nào → tự dịch từ ngôn ngữ đã có rồi mới lưu, báo 1 thông báo.
 * - Dịch lỗi (dịch vụ bận) → vẫn lưu phần đã nhập; `offerRetry` hiện thông báo có nút "Dịch lại".
 * `busy` = đang dịch (cho nút Lưu hiện trạng thái chờ).
 */
export function useAutoFill() {
  const { toast } = useUi();
  const [busy, setBusy] = useState(false);
  const last = useRef(null);

  const fillFn = useCallback(
    async (value, { lang, skipKeys } = {}) => {
      last.current = { value, lang, skipKeys };
      if (!needsFill(value, skipKeys)) return { value, failed: false, filled: [] };
      setBusy(true);
      const t = toast.loading("Đang tự dịch sang các ngôn ngữ còn trống…");
      try {
        const r = await fillMissingLanguages(value, { prefer: lang, skipKeys });
        if (r.filled.length)
          t.success("Hãy xem lại bản dịch khi rảnh.", {
            title: `Đã tự dịch sang ${namesOf(r.filled)}`,
          });
        else t.dismiss();
        last.current = { value: r.value, lang, skipKeys };
        return { value: r.value, failed: !!r.partial, filled: r.filled };
      } catch {
        t.dismiss();
        return { value, failed: true, filled: [] };
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );

  /** Sau khi đã lưu bản chưa dịch: báo lỗi dịch + nút "Dịch lại" (dịch xong gọi persist(bảnĐãDịch)) */
  const offerRetry = useCallback(
    (persist) => {
      const ctx = last.current;
      const retry = async () => {
        const t = toast.loading("Đang dịch lại…");
        try {
          const r = await fillMissingLanguages(ctx.value, {
            prefer: ctx.lang,
            skipKeys: ctx.skipKeys,
          });
          await persist(r.value);
          t.success("Hãy xem lại bản dịch khi rảnh.", {
            title: r.filled.length ? `Đã dịch và lưu ${namesOf(r.filled)}` : "Đã lưu",
          });
        } catch {
          t.warning("Dịch vụ dịch vẫn đang bận — hãy thử lại sau ít phút.", {
            title: "Chưa dịch được",
            action: { label: "Dịch lại", onClick: retry },
          });
        }
      };
      toast.warning(
        "Đã lưu phần bạn nhập. Các ngôn ngữ còn trống chưa được dịch vì dịch vụ đang bận.",
        {
          title: "Chưa tự dịch được",
          action: persist ? { label: "Dịch lại", onClick: retry } : null,
        },
      );
    },
    [toast],
  );

  return { fill: fillFn, offerRetry, busy };
}

/** Tạo đường dẫn (slug) từ tên: ưu tiên bản tiếng Anh, rồi tiếng Việt (bỏ dấu). Tiếng Trung không tạo được. */
export const slugSource = (loc) => loc?.en?.trim() || loc?.vi?.trim() || "";

/** Nút "Dịch tự động" — đặt cạnh tab ngôn ngữ của form */
export function AutoTranslate({
  lang,
  value,
  onChange,
  skipKeys,
  size = "sm",
  variant = "soft",
  className,
  label = "Dịch tự động",
}) {
  const { toast } = useUi();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const others = LANGS.filter((l) => l.key !== lang);

  const run = async () => {
    setBusy(true);
    try {
      const { value: next, count } = await translateTree(value, lang, { overwrite, skipKeys });
      if (!count) {
        toast(
          overwrite
            ? `Chưa có nội dung ${LANG_NAME[lang]} để dịch. Hãy nhập ${LANG_NAME[lang]} trước.`
            : `Không có ô nào còn trống để dịch.`,
          "info",
        );
      } else {
        onChange(next);
        toast.success("Hãy xem lại rồi bấm Lưu.", {
          title: `Đã dịch sang ${others.map((l) => LANG_NAME[l.key]).join(" và ")}`,
        });
      }
      setOpen(false);
    } catch (err) {
      toast.error(errorMessage(err), { title: "Chưa dịch được" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        icon={Languages}
        className={className}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        icon={Languages}
        title="Dịch tự động"
        description={`Dịch nội dung ${LANG_NAME[lang]} sang ${others.map((l) => LANG_NAME[l.key]).join(" và ")}.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              Huỷ
            </Button>
            <Button icon={Languages} loading={busy} onClick={run}>
              {busy ? "Đang dịch…" : "Dịch ngay"}
            </Button>
          </>
        }
      >
        <div className="space-y-2.5">
          {[
            {
              v: false,
              title: "Chỉ điền những ô còn trống",
              text: "Giữ nguyên các ô bạn đã tự soạn ở 2 ngôn ngữ kia.",
            },
            {
              v: true,
              title: "Dịch lại toàn bộ",
              text: "Thay nội dung hiện có ở 2 ngôn ngữ kia bằng bản dịch mới.",
            },
          ].map((o) => (
            <button
              key={String(o.v)}
              type="button"
              disabled={busy}
              onClick={() => setOverwrite(o.v)}
              aria-pressed={overwrite === o.v}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left ring-1 transition",
                overwrite === o.v
                  ? "bg-brand-50 ring-brand-400"
                  : "bg-white ring-slate-200 hover:ring-slate-300",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px]",
                  overwrite === o.v ? "border-brand-700" : "border-slate-300",
                )}
              >
                {overwrite === o.v && <span className="size-2 rounded-full bg-brand-700" />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-800">{o.title}</span>
                <span className="mt-0.5 block text-[13px] text-slate-500">{o.text}</span>
              </span>
            </button>
          ))}
          <p className="pt-1 text-[13px] leading-relaxed text-slate-500">
            Bản dịch do máy thực hiện — nên đọc lại tên riêng, giá và các câu quan trọng trước khi
            lưu.
          </p>
        </div>
      </Modal>
    </>
  );
}
