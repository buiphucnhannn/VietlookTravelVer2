/**
 * Link video do CMS dán vào (KHÔNG tải file video lên máy chủ):
 *   - YouTube (công khai hoặc không công khai): youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID,
 *     youtube.com/embed/ID, youtube-nocookie.com/embed/ID, hoặc chỉ mã ID 11 ký tự
 *   - Google Drive (đã chia sẻ "Bất kỳ ai có đường liên kết"): drive.google.com/file/d/ID/view, …/open?id=ID
 *
 * Bảo mật: chỉ nhận đúng 2 nhà cung cấp, chỉ https, rút ra MÃ video (ký tự [A-Za-z0-9_-]) rồi lưu dạng chuẩn.
 * Website dựng link nhúng (iframe) TỪ MÃ — không bao giờ nhúng nguyên văn link người dùng nhập
 * → không chèn được trang lạ / javascript: vào iframe.
 * BẢN SAO của be/src/utils/video.js (giữ 2 file giống nhau; file này có thêm embedUrl / videoThumb cho website).
 */
const YT_ID = /^[\w-]{11}$/;
const DRIVE_ID = /^[\w-]{20,80}$/;
const YT_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
]);

/** @returns {{ provider: "youtube"|"drive", id: string } | null} */
export function parseVideo(input) {
  const raw = String(input ?? "").trim();
  if (!raw || raw.length > 500) return null;
  if (YT_ID.test(raw)) return { provider: "youtube", id: raw }; // mã ID trần (dữ liệu cũ)
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const host = url.hostname.toLowerCase();

  if (YT_HOSTS.has(host)) {
    const id =
      host === "youtu.be"
        ? url.pathname.slice(1).split("/")[0]
        : url.pathname === "/watch"
          ? url.searchParams.get("v")
          : (url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)?.[1] ?? null);
    return id && YT_ID.test(id) ? { provider: "youtube", id } : null;
  }

  if (host === "drive.google.com") {
    const m = url.pathname.match(/^\/file\/d\/([^/]+)/);
    const id = m?.[1] ?? url.searchParams.get("id");
    return id && DRIVE_ID.test(id) ? { provider: "drive", id } : null;
  }
  return null;
}

/** Dạng lưu chuẩn trong DB */
export function canonicalVideo(input) {
  const v = parseVideo(input);
  if (!v) return null;
  return v.provider === "youtube"
    ? `https://www.youtube.com/watch?v=${v.id}`
    : `https://drive.google.com/file/d/${v.id}/view`;
}

/**
 * Link tải file Drive (đã chia sẻ công khai) — dựng TỪ MÃ file đã kiểm tra, không bao giờ dùng link người dùng nhập.
 * Dùng cho video nền trang chủ: Cloudinary tự tải file này về rồi lưu thành video của website.
 */
export function driveDownloadUrl(id) {
  if (!DRIVE_ID.test(String(id ?? ""))) return null;
  return `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;
}

/** Ảnh xem trước của file Drive đã chia sẻ (Google tự tạo) */
export function driveThumb(id, width = 1280) {
  return DRIVE_ID.test(String(id ?? ""))
    ? `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`
    : null;
}

/**
 * Video đã lưu trên Cloudinary (video nền banner chép từ Drive):
 *   https://res.cloudinary.com/<cloud>/video/upload/[<biến đổi>/]v<số>/<publicId>.<mp4|webm|jpg>
 * @returns {{ cloud: string, version: string, publicId: string } | null}
 */
const CLD_VIDEO =
  /^https:\/\/res\.cloudinary\.com\/([\w-]+)\/video\/upload\/(?:[\w,.:-]+\/)?v(\d{1,12})\/([\w-]+(?:\/[\w-]+){0,5})\.(?:mp4|webm)$/;
export function cloudinaryVideo(input) {
  const raw = String(input ?? "").trim();
  if (raw.length > 500) return null;
  const m = raw.match(CLD_VIDEO);
  return m ? { cloud: m[1], version: m[2], publicId: m[3] } : null;
}

/**
 * Bản dọc nhẹ cho điện thoại: cắt giữa khung 480×854 (đúng tỉ lệ màn hình dọc → nét hơn bản ngang 720px
 * bị phóng to khi phủ kín màn hình), nén mạnh (q_auto:eco) và giới hạn ~1 Mbps → phát mượt trên 4G.
 * Cùng thông số với bản tạo sẵn (eager) lúc chép video (be/src/services/upload.service.js).
 */
export const CLD_PHONE = "br_1m,c_fill,h_854,q_auto:eco,w_480";

/** Link phát video Cloudinary (mp4 nén tự động, rộng tối đa `width`) — dựng từ các phần đã kiểm tra */
export function cloudinaryVideoUrl(
  { cloud, version, publicId },
  { width = 1920, poster = false, phone = false } = {},
) {
  // cùng thứ tự tham số với Cloudinary SDK → trùng bản đã tạo sẵn (eager) lúc chép video
  const t = phone
    ? CLD_PHONE
    : poster
      ? `c_limit,q_auto,so_0,w_${width}`
      : `c_limit,q_auto,w_${width}`;
  return `https://res.cloudinary.com/${cloud}/video/upload/${t}/v${version}/${publicId}.${poster ? "jpg" : "mp4"}`;
}

/** Lời nhắn dễ hiểu khi link chưa dùng được ("" = link hợp lệ hoặc ô trống) */
export function videoLinkError(input) {
  const raw = String(input ?? "").trim();
  if (!raw || parseVideo(raw)) return "";
  const s = raw.toLowerCase();
  if (/drive\.google\.com\/(drive\/)?(u\/\d+\/)?folders\//.test(s))
    return "Đây là link thư mục Drive — hãy mở đúng video rồi bấm Chia sẻ để lấy link của video đó.";
  if (/(drive|docs)\.google\.com/.test(s))
    return "Link Drive chưa đúng — chuột phải vào video → Chia sẻ → Sao chép đường liên kết.";
  if (/youtu\.?be/.test(s))
    return "Đây chưa phải link của một video YouTube — hãy mở video rồi bấm Chia sẻ → Sao chép.";
  return "Chỉ nhận link video YouTube hoặc Google Drive.";
}

/** Link nhúng (iframe) dựng TỪ MÃ video — không dùng nguyên văn link người dùng nhập */
export function embedUrl(input, { background = false } = {}) {
  const v = parseVideo(input);
  if (!v) return null;
  if (v.provider === "drive") return `https://drive.google.com/file/d/${v.id}/preview`;
  const base = `https://www.youtube-nocookie.com/embed/${v.id}`;
  return background
    ? `${base}?autoplay=1&mute=1&loop=1&playlist=${v.id}&controls=0&playsinline=1&rel=0&modestbranding=1&disablekb=1`
    : `${base}?rel=0&modestbranding=1`;
}

/**
 * Ảnh xem trước: YouTube → ảnh bìa; Drive → ảnh Google tạo cho file đã chia sẻ (file riêng tư không có ảnh →
 * nơi hiển thị cần có ảnh thay thế khi lỗi); video Cloudinary → khung hình đầu.
 */
export function videoThumb(input, { large = false } = {}) {
  const c = cloudinaryVideo(input);
  if (c) return cloudinaryVideoUrl(c, { width: large ? 1920 : 640, poster: true });
  const v = parseVideo(input);
  if (!v) return null;
  // YouTube: hqdefault luôn có (maxresdefault thiếu ở nhiều video)
  return v.provider === "youtube"
    ? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`
    : driveThumb(v.id, large ? 1280 : 640);
}
