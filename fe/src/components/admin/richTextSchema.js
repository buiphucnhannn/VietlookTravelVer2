"use client";

import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions";
import ContentImage from "./richTextImage";
import { tableExtensions } from "./richTextTable";

/** Link mở tab mới luôn kèm rel an toàn (backend cũng tự thêm khi lưu) */
export const EXTERNAL_REL = "noopener noreferrer nofollow";

/**
 * Danh sách extension của ô soạn nội dung (RichText) — tách riêng để kiểm thử "mở → lưu không mất gì"
 * dùng đúng cấu hình này.
 * - Link: KHÔNG tự gắn target="_blank" / rel cho mọi link (mặc định của TipTap) — link trong website giữ nguyên
 *   (không nofollow), link mở tab mới mới có rel an toàn.
 * - onEditCredit(pos, credit): bấm "nguồn ảnh" dưới ảnh → mở hộp sửa (xem ./richTextImage.js)
 */
export function createEditorExtensions({ placeholder = "", onEditCredit = null } = {}) {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { target: null, rel: null },
      },
    }),
    ContentImage.configure({ HTMLAttributes: { loading: "lazy" }, onEditCredit }),
    ...tableExtensions,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Placeholder.configure({ placeholder }),
  ];
}
