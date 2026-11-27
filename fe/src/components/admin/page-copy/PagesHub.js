"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Car, Check, Home, LayoutTemplate, PencilLine, Stamp } from "lucide-react";
import { Compass, Luggage, Ship } from "lucide-react"; // nhóm Tour & du thuyền
import { BookOpenText, MapPinned } from "lucide-react"; // nhóm Trang danh sách
import { PartyPopper, Route, UsersRound } from "lucide-react"; // nhóm Tour nhóm & lên kế hoạch
import { Handshake, LayoutGrid, Mail } from "lucide-react"; // nhóm Thông tin & đối tác
import { Accessibility, PanelsTopLeft, SearchX } from "lucide-react"; // nhóm Toàn website
import { Files } from "lucide-react"; // thẻ Chữ chung trên trang chi tiết
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { ABOUT_HERO_IMAGES } from "@/data/about";
import { PAGE_COPY, PAGE_COPY_KEYS } from "@/lib/page-copy/registry.mjs";
import { countEdited, pageDefaults } from "@/lib/page-copy/resolve.mjs";
import Link from "../Link";
import { Badge, LANGS, LoadingBlock, Notice, PageHeader, anyLang, fmtDateTime } from "../ui";
import { canUser, useCurrentUser } from "../permissions";
import { slideBackground } from "../home/shared";
import { CONTENT_PAGES } from "../pages/list";

const BASE = `${ADMIN_BASE}/pages`;
const ICONS = {
  "car-rental": Car,
  "visa-fast-track": Stamp,
  "group-tailor-made-tours": UsersRound,
  "plan-your-trip": Route,
  "thank-you": PartyPopper,
  tours: Compass,
  "halong-bay-cruises": Ship,
  "halong-bay-overnight-cruises": Ship,
  "day-cruises": Ship,
  packages: Luggage,
  destinations: MapPinned,
  "travel-guide": BookOpenText,
  contact: Mail,
  partners: Handshake,
  services: LayoutGrid,
  global: PanelsTopLeft,
  "not-found": SearchX,
  access: Accessibility,
  detail: Files,
}; // biểu tượng trên thẻ (trang mới: mặc định LayoutTemplate)

/** Ảnh thẻ của 1 trang "Giao diện trang": ảnh đã thay, không thì ảnh mặc định của ô `thumb` */
function thumbOf(entry, data) {
  if (!entry.thumb) return entry.cover || ""; // trang không có ô ảnh: ảnh trang trí cố định (nếu có)
  const keys = String(entry.thumb ?? "").split(".");
  const pickIn = (obj) => keys.reduce((a, k) => a?.[k], obj);
  const saved = pickIn(data);
  if (typeof saved === "string" && saved) return saved;
  return pickIn(pageDefaults(entry, { dict: {}, data: {} }, "en")) || "";
}

/**
 * CMS → Giao diện trang: mọi trang công khai sửa được, mỗi trang 1 thẻ (ảnh + tên + đã sửa bao nhiêu mục).
 * Trang chủ và Giới thiệu / chính sách mở trình sửa riêng có sẵn; các trang khác (registry.mjs) mở PageCopyEditor.
 */
export default function PagesHub() {
  const user = useCurrentUser();
  const canHome = canUser(user, "home", "view");
  const [state, setState] = useState({ loading: true, error: "", copies: [], pages: [] });
  const [homeImage, setHomeImage] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([api("/settings/page-copy"), api("/settings/pages")])
      .then(
        ([c, p]) =>
          alive &&
          setState({ loading: false, error: "", copies: c.data ?? [], pages: p.data ?? [] }),
      )
      .catch(
        (err) =>
          alive && setState({ loading: false, error: errorMessage(err), copies: [], pages: [] }),
      );
    // ảnh thẻ Trang chủ = ảnh slide đầu của banner (dữ liệu công khai, đã cache)
    api("/public/home")
      .then((r) => alive && setHomeImage(slideBackground(r.data?.banner?.slides?.[0])))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const copyOf = (key) => state.copies.find((x) => x.key === key);
  const pageOf = (key) => state.pages.find((x) => x.key === key);
  // nhóm thẻ theo `group` trong registry, giữ đúng thứ tự khai báo
  const groups = [...new Set(PAGE_COPY_KEYS.map((k) => PAGE_COPY[k].group || "Trang khác"))];
  const about = CONTENT_PAGES[0];
  const aboutDoc = pageOf("about");

  return (
    <>
      <PageHeader
        title="Giao diện trang"
        description="Chọn một trang để sửa chữ và ảnh ngay trên bản xem trước — đúng như khách thấy trên website. Lưu xong website cập nhật ngay."
      />
      {state.error && (
        <Notice tone="error" className="mb-4">
          {state.error}
        </Notice>
      )}
      {state.loading ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-8">
          <section>
            <ListHeading>Trang chủ & giới thiệu</ListHeading>
            <div className="grid gap-5 md:grid-cols-2">
              {canHome && (
                <HubCard
                  href={`${ADMIN_BASE}/home`}
                  image={homeImage || "/images/services/svc-tour-cao-bang.webp"}
                  icon={Home}
                  title="Trang chủ"
                  text="Banner, tour nổi bật, điểm đến, chủ đề và chữ / ảnh của mọi khối trên trang chủ."
                  badge={<Badge tone="green">Đang hiện</Badge>}
                />
              )}
              <HubCard
                href={`${BASE}?key=about`}
                image={aboutDoc?.image || ABOUT_HERO_IMAGES[0]}
                icon={about.icon}
                title={about.label}
                text="Đầu trang, câu chuyện và 4 ảnh, tầm nhìn – sứ mệnh, giá trị cốt lõi, lý do chọn Vietlook, video và những con số."
                badge={<ContentBadge doc={aboutDoc} />}
                langs={langsOf(aboutDoc, true)}
                updatedAt={aboutDoc?.updatedAt}
              />
            </div>
          </section>

          {groups.map((g) => {
            const keys = PAGE_COPY_KEYS.filter((k) => (PAGE_COPY[k].group || "Trang khác") === g);
            // Dàn thẻ theo hàng, hàng cuối thiếu thẻ thì CĂN GIỮA (không để trống ô bên phải).
            // Nhóm 2 trang: 2 thẻ chia đôi hàng (như nhóm Trang chủ); còn lại 2 cột → 3 cột trên màn rộng.
            const cell =
              keys.length === 2
                ? "w-full md:w-[calc((100%-1.25rem)/2)]"
                : "w-full sm:w-[calc((100%-1.25rem)/2)] xl:w-[calc((100%-2.5rem)/3)]";
            return (
              <section key={g}>
                <ListHeading>{g}</ListHeading>
                <div className="flex flex-wrap justify-center gap-5">
                  {keys.map((k) => {
                    const entry = PAGE_COPY[k];
                    const doc = copyOf(k);
                    const n = countEdited(entry, doc?.data);
                    return (
                      <div key={k} className={cell}>
                        <HubCard
                          href={`${BASE}?key=${k}`}
                          image={thumbOf(entry, doc?.data)}
                          icon={ICONS[k] ?? LayoutTemplate}
                          title={entry.name}
                          text={entry.summary}
                          badge={
                            n ? (
                              <Badge tone="amber">Đã chỉnh sửa {n} mục</Badge>
                            ) : (
                              <Badge>Chưa chỉnh sửa</Badge>
                            )
                          }
                          foot={n ? null : "Đang dùng nội dung mặc định"}
                          updatedAt={n ? doc?.updatedAt : null}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <section>
            <ListHeading>Các trang chính sách</ListHeading>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {CONTENT_PAGES.slice(1).map((p) => {
                const doc = pageOf(p.key);
                return (
                  <HubCard
                    key={p.key}
                    href={`${BASE}?key=${p.key}`}
                    image={doc?.image}
                    icon={p.icon}
                    title={anyLang(doc?.title, "vi") || p.label}
                    text={p.text}
                    badge={<ContentBadge doc={doc} />}
                    langs={langsOf(doc, false)}
                    updatedAt={doc?.updatedAt}
                    compact
                  />
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

/** "Đã có nội dung" theo từng ngôn ngữ: trang Giới thiệu xét tiêu đề + câu chuyện, chính sách xét bài viết */
const langsOf = (doc, isAbout) =>
  Object.fromEntries(
    LANGS.map((l) => [
      l.key,
      isAbout
        ? Boolean(doc?.title?.[l.key]?.trim() || doc?.data?.story?.[l.key]?.length)
        : Boolean(doc?.body?.[l.key]?.trim()),
    ]),
  );

function ContentBadge({ doc }) {
  if (!doc) return <Badge tone="amber">Chưa có nội dung</Badge>;
  return doc.isActive === false ? <Badge>Đang ẩn</Badge> : <Badge tone="green">Đang hiện</Badge>;
}

function ListHeading({ children }) {
  return (
    <h2 className="mb-3 flex items-center gap-3 text-xs font-bold tracking-[0.16em] text-slate-500 uppercase">
      {children}
      <span className="h-px flex-1 bg-slate-200" />
    </h2>
  );
}

/** 1 thẻ trang: ảnh thu nhỏ (tên trang nổi trên ảnh) + mô tả + trạng thái */
function HubCard({ href, image, icon: Icon, title, text, badge, langs, foot, updatedAt, compact }) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand-200 focus-visible:ring-4 focus-visible:ring-brand-200 focus-visible:outline-none"
    >
      <div
        className={cn(
          "relative isolate flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand-800 to-brand-950 px-5 text-center text-white",
          compact ? "aspect-[16/9]" : "aspect-[16/8]",
        )}
      >
        {image && (
          <Image
            src={image}
            alt=""
            fill
            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
            className="-z-10 object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        <span className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-black/25 to-black/55" />
        <span className="flex flex-col items-center gap-2">
          {Icon && <Icon className="size-6 opacity-90" />}
          <span
            className={cn(
              "line-clamp-2 leading-tight font-extrabold tracking-tight drop-shadow-md",
              compact ? "text-lg" : "text-xl sm:text-2xl",
            )}
          >
            {title}
          </span>
        </span>
        <span className="absolute top-3 right-3">{badge}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <p className="flex-1 text-sm leading-relaxed text-slate-500">{text}</p>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {langs
            ? LANGS.map((l) => (
                <span
                  key={l.key}
                  title={langs[l.key] ? `Đã có bản ${l.label}` : `Chưa có bản ${l.label}`}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    langs[l.key] ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400",
                  )}
                >
                  {langs[l.key] && <Check className="size-3" />}
                  {l.short}
                </span>
              ))
            : foot && <span className="text-xs text-slate-400">{foot}</span>}
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
            <PencilLine className="size-3.5" />
            Sửa trang
          </span>
        </div>
        {updatedAt && (
          <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
            Cập nhật {fmtDateTime(updatedAt)}
          </p>
        )}
      </div>
    </Link>
  );
}
