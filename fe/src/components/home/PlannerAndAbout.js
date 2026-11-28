import { getContactInfo } from "@/lib/catalog";
import PlannerView from "./PlannerView";

/** Khối "About us" (ảnh blob + video giới thiệu): ./AboutBlob.js */
export { default as AboutBlob } from "./AboutBlob";

/** Form lên kế hoạch chuyến đi trên trang chủ (giao diện: ./PlannerView.js). */
export async function PlannerBlock({ lang, dict, destinationOptions }) {
  // Số WhatsApp + email: CMS → Thông tin liên hệ
  const { contact } = await getContactInfo();
  return (
    <PlannerView
      lang={lang}
      dict={dict}
      destinationOptions={destinationOptions}
      contact={contact}
    />
  );
}
