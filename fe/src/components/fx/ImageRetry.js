"use client";

import { useEffect } from "react";

/**
 * Ảnh Cloudinary lỗi tạm thời (lần ĐẦU yêu cầu 1 kích thước, Cloudinary phải tạo bản đó ngay; hoặc mạng
 * chập chờn ngắt kết nối) → tự tải lại tối đa 4 lần (1.5s, 4s, 8s, 15s).
 *
 * Là component React (không dùng thẻ <script>): chạy sau khi trang khởi động xong nên không đụng HTML lúc
 * React đang dựng (không có cảnh báo "script tag" / hydration). Ảnh đã lỗi TRƯỚC khi component chạy
 * cũng được tìm lại và tải lại. Chỉ áp dụng ảnh res.cloudinary.com; tham số `_r` chỉ để trình duyệt
 * không dùng lại phản hồi lỗi.
 */
const DELAYS = [1500, 4000, 8000, 15000];
const CDN = "res.cloudinary.com";

const withRetry = (list, n) =>
  list
    .split(",")
    .map((part) => {
      const bits = part.trim().split(/\s+/);
      if (!bits[0].includes(CDN)) return part.trim();
      const clean = bits[0].replace(/[?&]_r=\d+/, "");
      bits[0] = `${clean}${clean.includes("?") ? "&" : "?"}_r=${n}`;
      return bits.join(" ");
    })
    .join(", ");

function retry(img) {
  const src = img.currentSrc || img.src || "";
  if (!src.includes(CDN)) return;
  const n = Number(img.dataset.retry || 0);
  if (n >= DELAYS.length || img.dataset.retrying) return;
  img.dataset.retrying = "1";
  setTimeout(() => {
    delete img.dataset.retrying;
    img.dataset.retry = String(n + 1);
    if (img.srcset) img.srcset = withRetry(img.srcset, n + 1);
    img.src = withRetry(img.src, n + 1);
  }, DELAYS[n]);
}

export default function ImageRetry() {
  useEffect(() => {
    const onError = (e) => {
      if (e.target instanceof HTMLImageElement) retry(e.target);
    };
    document.addEventListener("error", onError, true);
    // ảnh đã lỗi trước khi component chạy (đã tải xong nhưng không có điểm ảnh)
    document.querySelectorAll("img").forEach((img) => {
      if (img.complete && img.naturalWidth === 0 && (img.currentSrc || img.src)) retry(img);
    });
    return () => document.removeEventListener("error", onError, true);
  }, []);
  return null;
}
