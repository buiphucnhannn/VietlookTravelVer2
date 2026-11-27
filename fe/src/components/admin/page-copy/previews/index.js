"use client";

import dynamic from "next/dynamic";
import { LoadingBlock } from "../../ui";

/**
 * Bản xem trước của từng trang (khoá = khoá trong lib/page-copy/registry.mjs). Thêm trang mới: thêm 1 dòng.
 * Tải riêng từng trang (chỉ tải bản xem trước của trang đang mở).
 */
const load = (fn) =>
  dynamic(fn, { loading: () => <LoadingBlock text="Đang dựng bản xem trước…" /> });

export const PREVIEWS = {
  global: load(() => import("./GlobalPreview")),
  "not-found": load(() => import("./NotFoundPreview")),
  access: load(() => import("./AccessPreview")),
  "car-rental": load(() => import("./CarRentalPreview")),
  "visa-fast-track": load(() => import("./VisaPreview")),
  "group-tailor-made-tours": load(() => import("./GroupToursPreview")),
  "plan-your-trip": load(() => import("./PlanTripPreview")),
  "thank-you": load(() => import("./ThankYouPreview")),
  destinations: load(() => import("./DestinationsPreview")),
  "travel-guide": load(() => import("./TravelGuidePreview")),
  contact: load(() => import("./ContactPreview")),
  partners: load(() => import("./PartnersPreview")),
  services: load(() => import("./ServicesPreview")),
  tours: load(() => import("./ToursPreview")),
  "halong-bay-cruises": load(() => import("./CruisePreview").then((m) => m.AllCruisesPreview)),
  "halong-bay-overnight-cruises": load(() =>
    import("./CruisePreview").then((m) => m.OvernightCruisesPreview),
  ),
  "day-cruises": load(() => import("./CruisePreview").then((m) => m.DayCruisesPreview)),
  packages: load(() => import("./PackagesPreview")),
  detail: load(() => import("./DetailPreview")),
};
