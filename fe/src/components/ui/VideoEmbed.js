import YouTubeLite from "./YouTubeLite";
import { embedUrl, parseVideo } from "@/lib/video";

/**
 * Video do CMS nhập (YouTube / Google Drive) — khung 16:9.
 * - YouTube: nhúng nhẹ (chỉ tải trình phát khi khách bấm phát).
 * - Google Drive (đã chia sẻ "Bất kỳ ai có đường liên kết"): khung xem chính thức của Drive, tải chậm (lazy).
 * Link nhúng dựng TỪ MÃ video (lib/video) — không bao giờ nhúng nguyên văn link người dùng nhập.
 * `fallbackId`: mã YouTube dùng khi chưa có video / link không hợp lệ.
 */
export default function VideoEmbed({ url, title, fallbackId }) {
  const v = parseVideo(url) ?? (fallbackId ? parseVideo(fallbackId) : null);
  if (!v) return null;
  if (v.provider === "youtube") return <YouTubeLite id={v.id} title={title} />;
  return (
    <div className="relative aspect-video bg-black">
      <iframe
        src={embedUrl(`https://drive.google.com/file/d/${v.id}/view`)}
        title={title}
        loading="lazy"
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 size-full border-0"
      />
    </div>
  );
}
