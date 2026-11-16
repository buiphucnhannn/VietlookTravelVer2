"use client";

import ImageExt from "@tiptap/extension-image";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";

/**
 * Ảnh trong ô soạn nội dung (RichText) — dùng chung cho bài viết, lịch trình tour, trang giới thiệu / chính sách…
 *
 * - Cỡ ảnh do CSS lo (globals.css `.admin-prose .rt-img`, website: theme.css `.prose-guide img`):
 *   giữ cỡ thật của ảnh (ảnh nhỏ không bị phóng to), ảnh lớn thu lại vừa khung, căn giữa.
 * - Ảnh cũ chuyển từ website trước có lớp alignleft / alignright → giữ lại (ảnh nằm bên trái / phải chữ).
 * - Mỗi ảnh có nút X ở góc trên bên phải để xoá (hiện khi rê chuột, khi chọn ảnh, luôn hiện trên màn cảm ứng).
 *   Xoá ảnh là xoá luôn chú thích của ảnh. Ảnh vừa chọn từ máy chỉ nằm trên máy (link tạm `blob:`) — xoá khỏi
 *   bài là không còn trong nội dung nên bấm Lưu sẽ không tải ảnh đó lên; link tạm được dọn khi đóng form
 *   (xem ./pendingImages.js), nhờ vậy "Hoàn tác" ngay sau khi xoá vẫn lấy lại được ảnh.
 * - Chú thích ảnh (không bắt buộc): dòng chữ nhỏ ngay dưới ảnh, bấm vào để gõ. Lưu thành
 *   <figure><img alt="mô tả"><figcaption>chú thích</figcaption></figure>; để trống → chỉ lưu <img>
 *   (không có figcaption rỗng). Enter trong ô chú thích → xuống dòng mới dưới ảnh để viết tiếp.
 *   Đọc được cả chú thích kiểu cũ: <figure>…<figcaption>, khung WordPress (.wp-caption + .wp-caption-text).
 * - Ghi công tác giả ảnh (ảnh Wikimedia Commons…) nằm trong chú thích:
 *   <figcaption>Mô tả. <span class="photo-credit">Photo: <a href="…">Tác giả</a> / …</span></figcaption>
 *   → giữ nguyên khi mở + lưu lại (chữ + link, thuộc tính credit = [{ text, href? }]); trong trình soạn hiện thành
 *   dòng chữ nhỏ dưới ô chú thích + nút "Thêm / Sửa nguồn ảnh" (hộp nhập Tác giả, Link, Nguồn, Giấy phép ở
 *   RichText.js, dựng lại bằng buildCredit()). Xoá ảnh là xoá luôn dòng này.
 * - alt (mô tả ảnh): giữ alt có sẵn; ảnh chưa có alt → lấy chú thích.
 */

const ALIGN_RX = /\balign(left|right|center)\b/;
const alignOf = (el) => el?.getAttribute?.("class")?.match(ALIGN_RX)?.[0] ?? null;
const clean = (s) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();

const captionEl = (box) =>
  box?.querySelector?.(":scope > figcaption, figcaption, .wp-caption-text") ?? null;

/** Chữ chú thích trong khung ảnh (figure / khung chú thích WordPress) — không tính dòng ghi công tác giả */
const captionIn = (box) => {
  const el = captionEl(box);
  if (!el) return "";
  const copy = el.cloneNode(true);
  for (const c of copy.querySelectorAll(".photo-credit")) c.remove();
  return clean(copy.textContent);
};

const CREDIT_HREF = /^(https?:\/\/|\/(?!\/)|mailto:)\S*$/i;
const isExternal = (href) => /^https?:/i.test(href);

/**
 * Dòng ghi công tác giả ảnh (<span class="photo-credit"> trong chú thích) → [{ text, href? }] (null nếu không có).
 * Chỉ giữ chữ + link (link lạ như javascript: → chỉ giữ chữ).
 */
const creditIn = (box) => {
  const span = captionEl(box)?.querySelector?.(".photo-credit");
  if (!span) return null;
  const parts = [];
  const push = (raw, href) => {
    const text = String(raw ?? "").replace(/\s+/g, " ");
    if (!text) return;
    const last = parts.at(-1);
    if (!href && last && !last.href) last.text += text;
    else parts.push(href ? { text, href } : { text });
  };
  const walk = (node) => {
    for (const c of node.childNodes) {
      if (c.nodeType === 3) push(c.textContent);
      else if (c.nodeType !== 1) continue;
      else if (c.tagName === "A" && CREDIT_HREF.test(c.getAttribute("href") ?? ""))
        push(c.textContent, c.getAttribute("href"));
      else walk(c);
    }
  };
  walk(span);
  if (parts.length) {
    parts[0].text = parts[0].text.trimStart();
    parts.at(-1).text = parts.at(-1).text.trimEnd();
  }
  const out = parts.filter((p) => p.text);
  return out.length ? out : null;
};

/** [{ text, href? }] → <span class="photo-credit">…</span> (link ra ngoài mở tab mới, rel an toàn) */
const creditSpec = (credit) => [
  "span",
  { class: "photo-credit" },
  ...credit.map(({ text, href }) =>
    href
      ? [
          "a",
          isExternal(href)
            ? { href, target: "_blank", rel: "noopener noreferrer nofollow" }
            : { href },
          text,
        ]
      : text,
  ),
];

/** Chữ đầu dòng ghi công theo ngôn ngữ bài */
export const CREDIT_PREFIX = { en: "Photo", vi: "Ảnh", zh: "图片" };

/** Tên giấy phép Creative Commons → link trang giấy phép (vd "CC BY-SA 4.0" → …/licenses/by-sa/4.0/) */
export function licenseUrlFor(name) {
  const m = String(name ?? "")
    .trim()
    .match(/^CC[\s-]+(BY(?:-(?:SA|ND|NC|NC-SA|NC-ND))?)[\s-]+(\d\.\d)$/i);
  return m ? `https://creativecommons.org/licenses/${m[1].toLowerCase()}/${m[2]}/` : "";
}

/**
 * [{ text, href? }] → các ô của hộp sửa nguồn ảnh. Hiểu các dạng:
 *   "Photo: <a>Tác giả</a> / Wikimedia Commons, <a>CC BY-SA 4.0</a>"
 *   "Photo: <a>Tác giả</a> / Pexels" · "Photo: Tác giả / Wikimedia Commons (CC0)"
 */
export function parseCredit(parts, fallbackPrefix = "Photo") {
  const f = {
    prefix: fallbackPrefix,
    author: "",
    authorUrl: "",
    source: "",
    license: "",
    licenseUrl: "",
  };
  const list = (parts ?? []).map((p) => ({ ...p }));
  if (!list.length) return f;
  const m = !list[0].href && list[0].text.match(/^\s*([^:：/]{1,24})[:：]\s*/);
  if (m) {
    f.prefix = m[1].trim();
    list[0].text = list[0].text.slice(m[0].length);
    if (!list[0].text) list.shift();
  }
  const first = list.shift();
  let rest = "";
  if (first?.href) {
    f.author = first.text.trim();
    f.authorUrl = first.href;
  } else if (first) {
    const i = first.text.indexOf(" / ");
    f.author = (i < 0 ? first.text : first.text.slice(0, i)).trim();
    rest = i < 0 ? "" : first.text.slice(i);
  }
  const licLink = list.find((p) => p.href);
  rest += list
    .slice(0, licLink ? list.indexOf(licLink) : undefined)
    .map((p) => p.text)
    .join("");
  f.source = (rest.match(/^\s*\/\s*([^,(]*?)\s*(?:[,(]|$)/)?.[1] ?? "").trim();
  if (licLink) {
    f.license = licLink.text.trim();
    f.licenseUrl = licLink.href;
  } else f.license = (rest.match(/\(([^)]+)\)\s*$/)?.[1] ?? "").trim();
  return f;
}

/** Các ô của hộp sửa nguồn ảnh → [{ text, href? }] (null nếu không có tác giả lẫn nguồn) */
export function buildCredit({ prefix, author, authorUrl, source, license, licenseUrl }) {
  const t = (v) => String(v ?? "").trim();
  if (!t(author) && !t(source)) return null;
  const parts = [];
  const add = (text, href) => {
    if (!text) return;
    const last = parts.at(-1);
    if (!href && last && !last.href) last.text += text;
    else parts.push(href ? { text, href } : { text });
  };
  add(`${t(prefix) || "Photo"}: `);
  if (t(author)) add(t(author), CREDIT_HREF.test(t(authorUrl)) ? t(authorUrl) : undefined);
  if (t(source)) add(t(author) ? ` / ${t(source)}` : t(source));
  if (t(license)) {
    if (CREDIT_HREF.test(t(licenseUrl))) {
      add(", ");
      add(t(license), t(licenseUrl));
    } else add(` (${t(license)})`);
  }
  return parts;
}

const X_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

const ContentImage = ImageExt.extend({
  addOptions() {
    return { ...this.parent?.(), onEditCredit: null };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: null,
        // ảnh trong khung chú thích cũ (<figure class="wp-caption alignleft">) lấy theo khung
        parseHTML: (el) => alignOf(el) ?? alignOf(el.closest?.("figure, .wp-caption")),
        renderHTML: (attrs) => (attrs.align ? { class: attrs.align } : {}),
      },
      caption: {
        default: "",
        parseHTML: (el) => captionIn(el.closest?.("figure, .wp-caption")),
        renderHTML: () => ({}), // ghi ra ở renderHTML của node (thẻ figcaption)
      },
      credit: {
        default: null,
        parseHTML: (el) => creditIn(el.closest?.("figure, .wp-caption")),
        renderHTML: () => ({}), // ghi ra trong thẻ figcaption
      },
    };
  },

  parseHTML() {
    const imgOf = (box) => box.querySelector("img[src]:not([src^='data:'])");
    const fromBox = (box) => {
      const img = imgOf(box);
      if (!img) return false;
      return {
        src: img.getAttribute("src"),
        alt: img.getAttribute("alt"),
        title: img.getAttribute("title"),
        width: img.getAttribute("width"),
        height: img.getAttribute("height"),
        align: alignOf(img) ?? alignOf(box),
        caption: captionIn(box),
        credit: creditIn(box),
      };
    };
    return [
      // khung ảnh + chú thích: đọc cả khung thành 1 ảnh (chú thích nằm trong thuộc tính caption)
      { tag: "figure", priority: 60, getAttrs: (el) => fromBox(el) },
      {
        tag: "div",
        priority: 60,
        getAttrs: (el) => (el.classList.contains("wp-caption") ? fromBox(el) : false),
      },
      ...this.parent(),
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const caption = clean(node.attrs.caption);
    const credit = node.attrs.credit?.length ? node.attrs.credit : null;
    const attrs = { ...this.options.HTMLAttributes, ...HTMLAttributes };
    if (!caption && !credit) return ["img", attrs];
    // alt: giữ mô tả ảnh có sẵn, chưa có thì lấy chú thích (SEO / người đọc màn hình); lớp căn trái / phải chuyển lên khung
    const { class: align, ...img } = attrs;
    const text = caption && credit ? [caption, " "] : caption ? [caption] : [];
    return [
      "figure",
      align ? { class: align } : {},
      ["img", { ...img, alt: img.alt || caption || null }],
      ["figcaption", {}, ...text, ...(credit ? [creditSpec(credit)] : [])],
    ];
  },

  addNodeView() {
    const { onEditCredit } = this.options;
    return ({ node, getPos, editor }) => {
      let current = node;
      const posOf = () => (typeof getPos === "function" ? getPos() : null);

      const dom = document.createElement("div");
      dom.className = "rt-img";
      dom.contentEditable = "false";

      const frame = document.createElement("div");
      frame.className = "rt-img-frame";
      dom.append(frame);

      const img = document.createElement("img");
      img.draggable = false;
      frame.append(img);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rt-img-x";
      btn.title = "Xoá ảnh";
      btn.setAttribute("aria-label", "Xoá ảnh");
      btn.innerHTML = X_ICON;
      frame.append(btn);

      // ô chú thích: textarea 1 dòng tự giãn (không xuống dòng — Enter = viết tiếp dưới ảnh)
      const cap = document.createElement("textarea");
      cap.className = "rt-img-cap";
      cap.rows = 1;
      cap.maxLength = 300;
      cap.spellcheck = true;
      cap.placeholder = "Thêm chú thích ảnh (không bắt buộc)…";
      cap.setAttribute("aria-label", "Chú thích ảnh");
      dom.append(cap);

      // dòng ghi công tác giả ảnh + nút "Thêm / Sửa nguồn ảnh" (mở hộp sửa ở RichText.js)
      const creditRow = document.createElement("div");
      creditRow.className = "rt-img-credit-row";
      const credit = document.createElement("span");
      credit.className = "rt-img-credit";
      const creditBtn = document.createElement("button");
      creditBtn.type = "button";
      creditBtn.className = "rt-img-credit-btn";
      creditRow.append(credit, creditBtn);
      dom.append(creditRow);
      creditBtn.hidden = !onEditCredit;
      creditBtn.addEventListener("mousedown", (e) => e.preventDefault());
      creditBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pos = posOf();
        if (typeof pos === "number") onEditCredit?.({ pos, credit: current.attrs.credit });
      });
      let creditKey = "";
      const paintCredit = (parts) => {
        const key = JSON.stringify(parts ?? null);
        if (key === creditKey) return;
        creditKey = key;
        const has = !!parts?.length;
        creditBtn.textContent = has ? "Sửa nguồn ảnh" : "+ Thêm nguồn ảnh (ghi công tác giả)";
        creditBtn.title = has
          ? "Sửa tác giả, link nguồn, giấy phép của ảnh"
          : "Ảnh lấy từ Wikimedia Commons, Pexels… cần ghi tên tác giả và giấy phép";
        creditRow.classList.toggle("has-credit", has);
        credit.replaceChildren(
          ...(parts ?? []).map(({ text, href }) => {
            if (!href) return document.createTextNode(text);
            const a = document.createElement("a");
            a.href = href;
            a.textContent = text;
            if (isExternal(href)) {
              a.target = "_blank";
              a.rel = "noopener noreferrer nofollow";
            }
            return a;
          }),
        );
        credit.hidden = !parts?.length;
      };

      const fit = () => {
        cap.style.height = "auto";
        if (cap.scrollHeight) cap.style.height = `${cap.scrollHeight}px`;
      };

      const paint = (n) => {
        const { src, alt, title, align, caption } = n.attrs;
        if (img.getAttribute("src") !== src) img.setAttribute("src", src ?? "");
        img.alt = alt || caption || "";
        if (title) img.title = title;
        else img.removeAttribute("title");
        dom.classList.remove("alignleft", "alignright", "aligncenter");
        if (align) dom.classList.add(align);
        // không ghi đè khi đang gõ (giữ vị trí con trỏ)
        if (document.activeElement !== cap && cap.value !== (caption ?? ""))
          cap.value = caption ?? "";
        dom.classList.toggle("has-cap", !!clean(caption));
        paintCredit(n.attrs.credit);
        requestAnimationFrame(fit);
      };
      paint(node);
      img.addEventListener("load", fit);

      /** Ghi chú thích vào tài liệu (Hoàn tác / Làm lại được như mọi thay đổi khác) */
      const commit = (value) => {
        const pos = posOf();
        if (typeof pos !== "number") return;
        const caption = value.replace(/[\r\n]+/g, " ");
        const prev = current.attrs.caption ?? "";
        if (caption === prev) return;
        // mô tả ảnh (alt) đang trống / đang dùng chính chú thích → đi theo chú thích mới
        const { alt } = current.attrs;
        const followAlt = !alt || clean(alt) === clean(prev);
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(pos, undefined, {
            ...current.attrs,
            caption,
            ...(followAlt && { alt: clean(caption) || null }),
          }),
        );
      };

      cap.addEventListener("input", () => {
        fit();
        commit(cap.value);
      });
      cap.addEventListener("blur", () => {
        const v = clean(cap.value);
        if (v !== cap.value) cap.value = v;
        commit(v);
      });
      cap.addEventListener("keydown", (e) => {
        // Hoàn tác / Làm lại của trình soạn (cả chú thích lẫn nội dung)
        if ((e.ctrlKey || e.metaKey) && /^[zy]$/i.test(e.key)) {
          e.preventDefault();
          const redo = e.key.toLowerCase() === "y" || e.shiftKey;
          if (redo) editor.commands.redo();
          else editor.commands.undo();
          cap.value = current.attrs.caption ?? "";
          fit();
          return;
        }
        if (e.key === "Enter" || e.key === "Escape") {
          e.preventDefault();
          commit(clean(cap.value));
          // Enter → con trỏ xuống dòng ngay dưới ảnh (tạo dòng trống nếu sau ảnh chưa có đoạn chữ)
          const pos = posOf();
          if (typeof pos !== "number") return;
          editor
            .chain()
            .focus()
            .command(({ tr, dispatch }) => {
              if (!dispatch) return true;
              const after = pos + current.nodeSize;
              const next = tr.doc.resolve(after).nodeAfter;
              if (e.key === "Escape") {
                tr.setSelection(NodeSelection.create(tr.doc, pos));
                return true;
              }
              if (!next || !next.isTextblock || next.content.size)
                tr.insert(after, tr.doc.type.schema.nodes.paragraph.create());
              tr.setSelection(TextSelection.create(tr.doc, after + 1));
              return true;
            })
            .scrollIntoView()
            .run();
        }
      });

      // giữ con trỏ trong ô soạn thảo khi bấm nút (không làm mất vùng chọn)
      btn.addEventListener("mousedown", (e) => e.preventDefault());
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pos = posOf();
        if (typeof pos !== "number") return;
        editor
          .chain()
          .focus()
          .deleteRange({ from: pos, to: pos + current.nodeSize })
          .run();
      });

      return {
        dom,
        update(n) {
          if (n.type !== current.type) return false;
          current = n;
          paint(n);
          return true;
        },
        // sự kiện trên nút X / ô chú thích do chúng tự xử lý (gõ chữ, bấm chuột, chạm, kéo chọn chữ)
        stopEvent: (e) =>
          btn.contains(e.target) || e.target === cap || creditRow.contains(e.target),
        ignoreMutation: () => true,
      };
    };
  },
});

export default ContentImage;

/**
 * Chèn ảnh tại con trỏ rồi đặt con trỏ vào dòng ngay dưới ảnh (tạo dòng trống nếu chưa có) — gõ tiếp là
 * viết chữ dưới ảnh, không thay mất ảnh vừa chèn. Muốn thêm chú thích: bấm dòng "Thêm chú thích ảnh…" dưới ảnh.
 */
export function insertImages(editor, srcs) {
  for (const src of srcs)
    editor
      .chain()
      .focus()
      .setImage({ src })
      .command(({ tr, dispatch }) => {
        const sel = tr.selection;
        if (!dispatch || !(sel instanceof NodeSelection) || sel.node.type.name !== "image")
          return true;
        const after = sel.to;
        const next = tr.doc.resolve(after).nodeAfter;
        if (!next || !next.isTextblock)
          tr.insert(after, tr.doc.type.schema.nodes.paragraph.create());
        tr.setSelection(TextSelection.create(tr.doc, after + 1));
        return true;
      })
      .scrollIntoView()
      .run();
}
