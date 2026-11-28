"use client";

import ContactSettingsCard from "./ContactSettingsCard";
import { usePermission } from "./permissions";
import { PageHeader } from "./ui";

/**
 * CMS → Thông tin liên hệ: điện thoại, email, địa chỉ, mạng xã hội, giờ làm việc của công ty — dùng chung cho mọi
 * trang website và email gửi khách. Quyền "Thông tin liên hệ" (contact): Xem = chỉ xem, Sửa = lưu được; admin luôn
 * được. (AdminShell đã chặn tài khoản không có quyền xem.)
 */
export default function ContactPage() {
  const { canEdit } = usePermission("contact");
  return (
    <>
      <PageHeader
        title="Thông tin liên hệ"
        description="Số điện thoại, email, địa chỉ, mạng xã hội, giờ làm việc — hiện trên mọi trang website (đầu trang, chân trang, trang Liên hệ, nút chat) và trong email gửi khách."
      />
      <ContactSettingsCard readOnly={!canEdit} />
    </>
  );
}
