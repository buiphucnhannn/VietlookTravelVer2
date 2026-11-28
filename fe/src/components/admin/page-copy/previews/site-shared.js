"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DEFAULT_CONTACT_VIEW, contactView } from "@/lib/contact.mjs";

/**
 * Dữ liệu chỉ-xem cho bản xem trước "Giao diện trang":
 *   useContactInfo() — thông tin liên hệ đang hiện trên website (CMS → Thông tin liên hệ)
 *   useSiteDict(lang) — từ điển giao diện website (tên menu, chữ cố định) theo ngôn ngữ đang sửa
 */

let contactCache = null;
export function useContactInfo() {
  const [info, setInfo] = useState(contactCache ?? DEFAULT_CONTACT_VIEW);
  useEffect(() => {
    let alive = true;
    api("/public/site")
      .then((r) => {
        contactCache = contactView(r.data?.contact);
        if (alive) setInfo(contactCache);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return info;
}

const DICTS = {
  en: () => import("@/i18n/dictionaries/en"),
  zh: () => import("@/i18n/dictionaries/zh"),
  vi: () => import("@/i18n/dictionaries/vi"),
};
export function useSiteDict(lang) {
  const [dict, setDict] = useState(null);
  useEffect(() => {
    let alive = true;
    (DICTS[lang] ?? DICTS.en)().then((m) => alive && setDict(m.default));
    return () => {
      alive = false;
    };
  }, [lang]);
  return dict;
}

/** Link sang trang CMS Thông tin liên hệ */
export const CONTACT_SETTINGS_HREF = "/contact";
