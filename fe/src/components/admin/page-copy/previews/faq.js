"use client";

import { Txt } from "../blocks";

/**
 * 1 câu hỏi thường gặp dựng y như thẻ <details> trên website, nhưng luôn mở (để sửa cả câu trả lời).
 * Lớp kiểu (thẻ / dòng hỏi / đoạn trả lời) chép đúng từ trang thật; `before` / `after`: số thứ tự, dấu +.
 */
export function FaqItem({
  f,
  className,
  summaryClassName,
  qClassName = "flex-1",
  answerClassName,
  before,
  after,
  dark,
}) {
  return (
    <details open className={className}>
      {/* bấm vào câu hỏi = sửa chữ, không đóng thẻ */}
      <summary className={summaryClassName} onClick={(e) => e.preventDefault()}>
        {before}
        <span className={qClassName}>
          <Txt f={`${f}.q`} dark={dark} />
        </span>
        {after}
      </summary>
      <p className={answerClassName}>
        <Txt f={`${f}.a`} dark={dark} />
      </p>
    </details>
  );
}
