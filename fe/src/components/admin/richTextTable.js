"use client";

import { mergeAttributes } from "@tiptap/react";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";

/**
 * Bảng trong ô soạn nội dung (RichText) — bài viết có bảng so sánh, bảng giá, bảng thời tiết…
 *
 * - Đọc được bảng có sẵn: <table><thead><tr><th>…</th></tr></thead><tbody>…</tbody></table> (ô tiêu đề trống được).
 * - Ghi ra HTML gọn, giống bảng nhập vào: không có <colgroup> / độ rộng cột (không kéo giãn cột) — cỡ bảng do CSS
 *   lo (website: theme.css `.prose-guide table`, CMS: globals.css `.admin-prose table`).
 * - TipTap luôn ghi mọi hàng vào <tbody> và bọc chữ trong ô / mục danh sách bằng <p> → tidyEditorHtml() sửa lại khi
 *   xuất HTML: các hàng đầu toàn ô tiêu đề (<th>) chuyển vào <thead>; ô bảng / mục danh sách chỉ có 1 đoạn chữ thì bỏ
 *   thẻ <p> thừa (giữ HTML giống hệt bài nhập vào: <li><strong>…</strong> …</li>).
 */

const PlainTable = Table.extend({
  renderHTML({ HTMLAttributes }) {
    // bỏ <colgroup> + style min-width TipTap tự thêm; giữ class / style có sẵn của bảng
    return ["table", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), ["tbody", 0]];
  },
});

export const tableExtensions = [
  // không kéo giãn cột; trong CMS bảng nằm trong khung .tableWrapper cuộn ngang được (chỉ để hiển thị, không lưu)
  PlainTable.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
];

/** Bảng mới: 3 cột, 3 hàng (hàng đầu là hàng tiêu đề) */
export const NEW_TABLE = { rows: 3, cols: 3, withHeaderRow: true };

const isBarePara = (n) => n?.nodeType === 1 && n.tagName === "P" && !n.attributes.length;
const meaningful = (el) =>
  [...el.childNodes].filter((n) => !(n.nodeType === 3 && !n.textContent.trim()));

/** Sửa HTML TipTap ghi ra cho gọn (xem ghi chú đầu file). Không có bảng / danh sách → trả nguyên HTML. */
export function tidyEditorHtml(html) {
  if (!html || !/<(table|li)\b/.test(html) || typeof document === "undefined") return html;
  const tpl = document.createElement("template"); // phân tích "trơ": không tải ảnh, không chạy mã
  tpl.innerHTML = html;
  for (const table of tpl.content.querySelectorAll("table")) {
    const tbody = [...table.children].find((el) => el.tagName === "TBODY");
    if (!tbody || [...table.children].some((el) => el.tagName === "THEAD")) continue;
    const head = [];
    for (const tr of tbody.children) {
      const cells = [...tr.children];
      if (!cells.length || cells.some((c) => c.tagName !== "TH")) break;
      head.push(tr);
    }
    // cả bảng toàn ô tiêu đề → giữ nguyên trong tbody
    if (head.length && head.length < tbody.children.length) {
      const thead = document.createElement("thead");
      thead.append(...head);
      table.insertBefore(thead, tbody);
    }
  }
  // ô bảng chỉ có 1 đoạn chữ; mục danh sách có 1 đoạn chữ (có thể kèm danh sách con phía sau) → bỏ <p>
  for (const el of tpl.content.querySelectorAll("th, td, li")) {
    const kids = meaningful(el);
    const ok =
      el.tagName === "LI"
        ? isBarePara(kids[0]) && kids.slice(1).every((n) => /^(UL|OL)$/.test(n.tagName ?? ""))
        : kids.length === 1 && isBarePara(kids[0]);
    if (ok) kids[0].replaceWith(...kids[0].childNodes);
  }
  return tpl.innerHTML;
}
