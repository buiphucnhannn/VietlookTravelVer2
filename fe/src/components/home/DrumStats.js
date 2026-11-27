import { getCatalog } from "@/lib/catalog";
import DrumStatsView, { buildDrumStats } from "./DrumStatsView";

/**
 * "Vietlook in numbers" – chủ đề SƠN MÀI & ĐỒNG:
 * nền sơn mài đỏ thẫm, trống đồng Đông Sơn màu đồng (Demo 3) xoay chậm ở tâm; 6 con số thật
 * nằm TRÊN một quỹ đạo nét đứt bao quanh trống (có chấm sáng chạy vòng) → trống, quỹ đạo và
 * con số gắn liền thành một hình. Mỗi con số dẫn tới trang liên quan.
 * Desktop: bố cục quỹ đạo; mobile: trống + lưới 2 cột. Giao diện: ./DrumStatsView.js
 */
export default async function DrumStats({ lang, dict }) {
  const catalog = await getCatalog();
  return <DrumStatsView lang={lang} t={dict.home} stats={buildDrumStats(catalog, dict, lang)} />;
}
