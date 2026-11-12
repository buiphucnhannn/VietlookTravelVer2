import CruisePage, { cruiseMetadata } from "@/components/tours/CruisePage";

/** Du thuyền Vịnh Hạ Long ngủ đêm (mục 4.2.1) */
export const generateMetadata = ({ params }) => cruiseMetadata("overnight", params);

export default function OvernightCruisesPage({ params }) {
  return <CruisePage kind="overnight" params={params} />;
}
