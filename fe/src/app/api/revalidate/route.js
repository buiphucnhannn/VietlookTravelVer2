import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { PROXY_SECRET_HEADER } from "@/config/urls.mjs";

/**
 * Backend báo website làm mới cache NGAY khi dữ liệu đổi mà không do CMS lưu
 * (vd. máy chủ tự cập nhật điểm & số lượt đánh giá Tripadvisor / Google lúc ~06:00 — be/src/services/review-stats.service.js).
 * Xác thực bằng mã bí mật chung PROXY_SECRET (header x-proxy-secret, cùng giá trị ở backend & Vercel).
 * Chưa đặt PROXY_SECRET: chỉ nhận khi chạy dev ở máy (production luôn từ chối).
 * Chỉ cho xoá thẻ "settings" — không mở rộng thành công cụ xoá cache tuỳ ý.
 */
const ALLOWED = new Set(["settings"]);

function authorized(req) {
  const secret = process.env.PROXY_SECRET ?? "";
  if (!secret) return process.env.NODE_ENV !== "production";
  const got = Buffer.from(req.headers.get(PROXY_SECRET_HEADER) ?? "");
  const want = Buffer.from(secret);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function POST(req) {
  if (!authorized(req)) return Response.json({ ok: false }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const tags = (Array.isArray(body?.tags) ? body.tags : []).filter((t) => ALLOWED.has(t));
  if (!tags.length) return Response.json({ ok: false }, { status: 400 });
  // expire: 0 → lượt xem kế tiếp lấy dữ liệu mới luôn (không hiện bản cũ thêm 1 lần)
  tags.forEach((t) => revalidateTag(t, { expire: 0 }));
  return Response.json({ ok: true, tags });
}
