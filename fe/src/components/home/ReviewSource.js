import { Mail, MessageSquareQuote } from "lucide-react";
import { siteConfig } from "@/constants/site";
import { fmtMonthYear } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { FacebookIcon, GoogleIcon, TripAdvisorIcon } from "@/components/ui/BrandIcons";

/** Trang chung của từng nguồn — dùng khi đánh giá chưa có link bài gốc */
const FALLBACK = {
  tripadvisor: siteConfig.social.tripadvisor,
  google: siteConfig.social.google,
  facebook: siteConfig.social.facebook,
};

function SourceIcon({ source }) {
  if (source === "google") return <GoogleIcon className="size-3.5" />;
  if (source === "facebook") return <FacebookIcon className="size-3.5 text-[#1877f2]" />;
  if (source === "email") return <Mail className="size-3.5" />;
  if (source === "other") return <MessageSquareQuote className="size-3.5" />;
  return <TripAdvisorIcon className="size-4 text-[#00af87]" />;
}

/** Chữ nguồn theo ngôn ngữ trang: "on Tripadvisor" · "Google" · "Facebook" · "Sent by email" · "View original" */
function sourceLabel(source, t) {
  if (source === "google") return "Google";
  if (source === "facebook") return "Facebook";
  if (source === "email") return t.reviewsEmail;
  if (source === "other") return t.reviewsSourceLink;
  return t.reviewsVerified;
}

/**
 * Dòng nguồn dưới tên khách: biểu tượng + nguồn (link tới bài đánh giá gốc) · tháng/năm đánh giá (nếu có).
 * `t` = dict.home. Đánh giá qua email / nguồn khác không có link → chỉ hiện chữ, không thành link.
 */
export default function ReviewSource({ review: r, lang, t, className, stretch = false }) {
  const href = r.url || FALLBACK[r.source] || "";
  const date = r.date ? fmtMonthYear(r.date, lang) : "";
  const label = (
    <>
      <SourceIcon source={r.source} />
      {sourceLabel(r.source, t)}
    </>
  );
  if (r.source === "other" && !href && !date) return null;
  return (
    <span className={cn("mt-0.5 flex w-fit items-center gap-1.5 text-xs text-muted", className)}>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-1 hover:text-ink hover:underline",
            // phủ cả thẻ: lớp ::after trải kín thẻ cha (thẻ cha cần "relative")
            stretch && "after:absolute after:inset-0 after:rounded-[inherit] after:content-['']",
          )}
        >
          {label}
        </a>
      ) : r.source !== "other" ? (
        <span className="flex items-center gap-1">{label}</span>
      ) : null}
      {date && (
        <>
          {(href || r.source !== "other") && <span aria-hidden>·</span>}
          <time dateTime={r.date}>{date}</time>
        </>
      )}
    </span>
  );
}

/**
 * Ghi chú nhỏ dưới tiêu đề khối khi có đánh giá không viết bằng ngôn ngữ trang (lời khách giữ nguyên văn):
 * toàn bộ là tiếng Anh trên Tripadvisor → câu cũ (reviewsOriginal); còn lại → câu chung (reviewsOriginalAny).
 */
export function originalNote(reviews, lang, t) {
  const langs = reviews.map((r) => r.language || "en");
  if (!langs.some((l) => l !== lang)) return "";
  const tripadvisorEnglish =
    langs.every((l) => l === "en") && reviews.every((r) => r.source === "tripadvisor");
  return (tripadvisorEnglish && t.reviewsOriginal) || t.reviewsOriginalAny || "";
}
