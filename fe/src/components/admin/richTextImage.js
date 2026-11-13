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
 *   <figure><img alt="chú thích"><figcaption>chú thích</figcaption></figure>; để trống → chỉ lưu <img>
 *   (không có figcaption rỗng). Enter trong ô chú thích → xuống dòng mới dưới ảnh để viết tiếp.
 *   Đọc được cả chú thích kiểu cũ: <figure>…<figcaption>, khung WordPress (.wp-caption + .wp-caption-text).
 */

const ALIGN_RX = /\balign(left|right|center)\b/;
const alignOf = (el) => el?.getAttribute?.("class")?.match(ALIGN_RX)?.[0] ?? null;
const clean = (s) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();

/** Chữ chú thích trong khung ảnh (figure / khung chú thích WordPress) */
const captionIn = (box) =>
  clean(box?.querySelector?.(":scope > figcaption, figcaption, .wp-caption-text")?.textContent);

const X_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

const ContentImage = ImageExt.extend({
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
    const attrs = { ...this.options.HTMLAttributes, ...HTMLAttributes };
    if (!caption) return ["img", attrs];
    // có chú thích: alt = chú thích (SEO / người đọc màn hình); lớp căn trái / phải chuyển lên khung
    const { class: align, ...img } = attrs;
    return [
      "figure",
      align ? { class: align } : {},
      ["img", { ...img, alt: caption }],
      ["figcaption", {}, caption],
    ];
  },

  addNodeView() {
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

      const fit = () => {
        cap.style.height = "auto";
        if (cap.scrollHeight) cap.style.height = `${cap.scrollHeight}px`;
      };

      const paint = (n) => {
        const { src, alt, title, align, caption } = n.attrs;
        if (img.getAttribute("src") !== src) img.setAttribute("src", src ?? "");
        img.alt = caption || alt || "";
        if (title) img.title = title;
        else img.removeAttribute("title");
        dom.classList.remove("alignleft", "alignright", "aligncenter");
        if (align) dom.classList.add(align);
        // không ghi đè khi đang gõ (giữ vị trí con trỏ)
        if (document.activeElement !== cap && cap.value !== (caption ?? ""))
          cap.value = caption ?? "";
        dom.classList.toggle("has-cap", !!clean(caption));
        requestAnimationFrame(fit);
      };
      paint(node);
      img.addEventListener("load", fit);

      /** Ghi chú thích vào tài liệu (Hoàn tác / Làm lại được như mọi thay đổi khác) */
      const commit = (value) => {
        const pos = posOf();
        if (typeof pos !== "number") return;
        const caption = value.replace(/[\r\n]+/g, " ");
        if (caption === (current.attrs.caption ?? "")) return;
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, caption }),
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
        stopEvent: (e) => btn.contains(e.target) || e.target === cap,
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
