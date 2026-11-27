import { tr } from "@/i18n/config";
import { airportFrom, carRoutes, places, quoteRoutes, routeTitle } from "./cars";

// Dải ảnh đội xe trang Thuê xe: ảnh HD (≥1600px, Pexels – miễn phí thương mại) thay cho ảnh thumbnail ≤600px bị mờ.
// Dùng chung cho trang Thuê xe và bản xem trước trong CMS (Giao diện trang → Thuê xe).
const HD = "/images/cars";
export const fleetPhotos = () => ({
  exterior: [
    "sedan-v3a",
    "suv-u1",
    "minivan-1",
    "luxury-v3a",
    "limo-1",
    "van16-1",
    "coach29-u1",
    "coach45-u1",
    "ext-chauffeur-1",
    "sedan-v3b",
    "suv-u2",
    "limo-v3b",
    "van16-2",
    "coach29-u2",
    "coach45-u2",
    "coach45-vn",
    "ext-chauffeur-2",
    "ext-saigon-street",
  ].map((n) => `${HD}/${n}.webp`),
  interior: [
    "luxury-2",
    "limo-2",
    "int-limo-white",
    "int-vclass",
    "int-van-lounge",
    "int-beige",
    "int-leather",
    "int-beige-2",
  ].map((n) => `${HD}/${n}.webp`),
});

/** Dữ liệu các khối tự động trang Thuê xe (đội xe, tuyến & giá, form báo giá) từ hạng xe + khu vực trong CMS */
export function carPageData({ fleet, carAreas }, lang) {
  const fleetData = fleet.map((f) => ({
    ...f,
    name: { label: tr(f.name, lang) },
    tagline: tr(f.tagline, lang),
    description: tr(f.description, lang),
    ideal: tr(f.ideal, lang),
    from: airportFrom(f.priceKey),
  }));
  const areas = carAreas.map((a) => ({ key: a.key, name: tr(a.name, lang), airport: a.airport }));
  const routes = carRoutes.map((r) => ({
    ...r,
    ...quoteRoutes.find((q) => q.slug === r.slug),
    label: routeTitle(r.title, lang),
  }));
  const classes = fleet
    .filter((f) => f.priceKey)
    .map((f) => ({ key: f.priceKey, vehicle: f.key, label: tr(f.name, lang).split(" – ")[0] }));
  const vehicles = fleet.map((f) => ({
    key: f.key,
    name: tr(f.name, lang),
    seats: f.seats,
    pax: f.pax,
    luggage: f.luggage,
    priceKey: f.priceKey,
    image: f.images[0],
  }));
  const placeList = Object.entries(places).map(([key, v]) => ({
    key,
    group: v.group,
    name: tr(v.name, lang),
  }));
  return { fleetData, areas, routes, classes, vehicles, placeList };
}
