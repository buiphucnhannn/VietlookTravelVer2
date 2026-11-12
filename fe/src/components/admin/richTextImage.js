"use client";

import ImageExt from "@tiptap/extension-image";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";

/**
 * Ảnh trong ô soạn nội dung (RichText).
 *
 * - Cỡ ảnh do CSS lo (globals.css `.admin-prose .rt-img`, website: theme.css `.prose-guide img`):
 *   giữ cỡ thật của ảnh (ảnh nhỏ không bị phóng to), ảnh lớn thu lại vừa khung, căn giữa.
 * - Ảnh cũ chuyển từ website trước có lớp alignleft / alignright → giữ lại (ảnh nằm bên trái / phải chữ).
 * - Mỗi ảnh có nút X ở góc trên bên phải để xoá (hiện khi rê chuột, khi chọn ảnh, luôn hiện trên màn cảm ứng).
 *   Ảnh vừa chọn từ máy chỉ nằm trên máy (link tạm `blob:`) — xoá khỏi bài là không còn trong nội dung nên
 *   bấm Lưu sẽ không tải ảnh đó lên; link tạm được dọn khi đóng form (xem ./pendingImages.js), nhờ vậy
 *   "Hoàn tác" ngay sau khi xoá vẫn lấy lại được ảnh.
 */

const ALIGN_RX = /\balign(left|right|center)\b/;
const alignOf = (el) => el?.getAttribute?.("class")?.match(ALIGN_RX)?.[0] ?? null;

const X_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

const ContentImage = ImageExt.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: null,
        // ảnh trong khung chú thích cũ (<figure class="wp-caption alignleft">) lấy theo khung
        parseHTML: (el) => alignOf(el) ?? alignOf(el.closest?.("figure")),
        renderHTML: (attrs) => (attrs.align ? { class: attrs.align } : {}),
      },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      let current = node;

      const dom = document.createElement("div");
      dom.className = "rt-img";
      dom.contentEditable = "false";

      const img = document.createElement("img");
      img.draggable = false;
      dom.append(img);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rt-img-x";
      btn.title = "Xoá ảnh";
      btn.setAttribute("aria-label", "Xoá ảnh");
      btn.innerHTML = X_ICON;
      dom.append(btn);

      const paint = (n) => {
        const { src, alt, title, align } = n.attrs;
        if (img.getAttribute("src") !== src) img.setAttribute("src", src ?? "");
        img.alt = alt ?? "";
        if (title) img.title = title;
        else img.removeAttribute("title");
        dom.classList.remove("alignleft", "alignright", "aligncenter");
        if (align) dom.classList.add(align);
      };
      paint(node);

      // giữ con trỏ trong ô soạn thảo khi bấm nút (không làm mất vùng chọn)
      btn.addEventListener("mousedown", (e) => e.preventDefault());
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pos = typeof getPos === "function" ? getPos() : null;
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
        // sự kiện trên nút X do nút tự xử lý (bàn phím Enter / Space, chạm, bấm chuột)
        stopEvent: (e) => btn.contains(e.target),
        ignoreMutation: () => true,
      };
    };
  },
});

export default ContentImage;

/**
 * Chèn ảnh tại con trỏ rồi đặt con trỏ vào dòng ngay dưới ảnh (tạo dòng trống nếu chưa có) — gõ tiếp là
 * viết chữ dưới ảnh, không thay mất ảnh vừa chèn.
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
