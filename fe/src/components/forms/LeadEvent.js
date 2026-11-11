"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trackWhenConsented } from "@/lib/consent";

/**
 * Sự kiện chuyển đổi trên trang cảm ơn: `generate_lead` kèm loại form (GTM: dataLayer; gtag.js: sự kiện GA4) —
 * CHỈ khi khách đã đồng ý cookie (hoặc ngay khi khách đồng ý trên trang này). Mỗi mã yêu cầu chỉ tính 1 lần
 * (F5 không đếm lại). Không cài mã Google → không làm gì. Đặt trong <Suspense> (đọc ?code=&type=).
 */
export default function LeadEvent() {
  const params = useSearchParams();
  const code = params.get("code") || "";
  const type = params.get("type") || "";

  useEffect(() => {
    if (!code && !type) return;
    const key = `vl-lead:${code || type}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {}
    return trackWhenConsented(
      "generate_lead",
      { form_type: type, enquiry_type: type, request_code: code },
      () => {
        try {
          sessionStorage.setItem(key, "1");
        } catch {}
      },
    );
  }, [code, type]);

  return null;
}
