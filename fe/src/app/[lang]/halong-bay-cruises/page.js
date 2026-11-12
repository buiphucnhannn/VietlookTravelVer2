import CruisePage, { cruiseMetadata } from "@/components/tours/CruisePage";

export const generateMetadata = ({ params }) => cruiseMetadata("all", params);

export default function CruisesPage({ params }) {
  return <CruisePage kind="all" params={params} />;
}
