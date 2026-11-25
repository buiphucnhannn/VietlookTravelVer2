import { CalendarX2, CreditCard, FileText, Info, ShieldCheck } from "lucide-react";
import { PAGE_LABELS } from "../labels";

/** Trang giới thiệu + 4 trang chính sách (sửa ở ContentPagesPage → PageEditor, lưu ở /settings/pages/:key) */
export const CONTENT_PAGES = [
  {
    key: "about",
    label: PAGE_LABELS.about,
    icon: Info,
    url: "/about",
    text: "Câu chuyện, tầm nhìn, sứ mệnh và giá trị cốt lõi của Vietlook.",
  },
  {
    key: "terms",
    label: PAGE_LABELS.terms,
    icon: FileText,
    url: "/policies/terms",
    text: "Điều khoản khi khách sử dụng website và dịch vụ.",
  },
  {
    key: "privacy",
    label: PAGE_LABELS.privacy,
    icon: ShieldCheck,
    url: "/policies/privacy",
    text: "Cách thu thập, sử dụng và bảo vệ thông tin khách hàng.",
  },
  {
    key: "payment",
    label: PAGE_LABELS.payment,
    icon: CreditCard,
    url: "/policies/payment",
    text: "Hình thức thanh toán, đặt cọc và hoàn tiền.",
  },
  {
    key: "cancellation",
    label: PAGE_LABELS.cancellation,
    icon: CalendarX2,
    url: "/policies/cancellation",
    text: "Điều kiện và phí khi khách hủy hoặc đổi tour.",
  },
];
