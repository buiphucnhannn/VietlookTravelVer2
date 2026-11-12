import CruisePage, { cruiseMetadata } from "@/components/tours/CruisePage";

/** Du thuyền trải nghiệm trong ngày: Hạ Long, Nha Trang, Phú Quốc (mục 4.2.1) */
export const generateMetadata = ({ params }) => cruiseMetadata("day", params);

export default function DayCruisesPage({ params }) {
  return <CruisePage kind="day" params={params} />;
}
