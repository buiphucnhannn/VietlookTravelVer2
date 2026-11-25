"use client";

import { useContext, useEffect, useState } from "react";
import { ChevronRight, Lock, MapPinned } from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { regions } from "@/data/regions";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AutoNote, Pic } from "../../home/shared";
import {
  ImagePill,
  ListOf,
  ModuleNote,
  PageCopyContext,
  Sec,
  Shown,
  Txt,
  useCopyField,
} from "../blocks";

/**
 * Bản xem trước trang Tất cả điểm đến (app/[lang]/destinations/page.js) — thu nhỏ, đúng thứ tự trang thật:
 * đầu trang 3 ảnh → thanh nhảy nhanh 3 miền → mỗi miền 1 khối (số điểm đến · tên miền · giới thiệu · lưới thẻ).
 * Thẻ điểm đến (tên, ảnh, số tour): CMS → Điểm đến → hiện mờ để xem, không sửa ở đây.
 * Tên 3 miền: cố định theo hợp đồng (data/regions.js) → chỉ hiện.
 */

const DEST_ADMIN = `${ADMIN_BASE}/destinations`;
const TILES_SHOWN = 4; // bản xem trước chỉ hiện vài thẻ đầu của mỗi miền

/** Chữ của { en, zh, vi } theo ngôn ngữ đang sửa (thiếu thì tiếng Anh) */
const useLoc = () => {
  const lang = useContext(PageCopyContext)?.lang ?? "vi";
  return (v) => v?.[lang] || v?.en || "";
};

/** 1 ô ảnh của dải 3 ảnh đầu trang (điện thoại chỉ hiện ảnh đầu, như trang thật) */
function HeroTile({ i }) {
  const fld = useCopyField(`heroImages.${i}`);
  return (
    <div className={cn("relative h-full flex-1", i > 0 && "hidden md:block")}>
      <Pic src={fld.value || fld.def} sizes="480px" />
    </div>
  );
}

/** Điểm đến đang hiện trên website (chỉ để mô phỏng lưới thẻ; lỗi mạng → khung trống + ghi chú) */
function useDestinations() {
  const [list, setList] = useState(null);
  useEffect(() => {
    let alive = true;
    api("/public/destinations")
      .then((r) => alive && setList(Array.isArray(r.data) ? r.data : []))
      .catch(() => alive && setList([]));
    return () => {
      alive = false;
    };
  }, []);
  return list;
}

/** Thẻ khung vòm như DestinationTile — mờ, không bấm được (dữ liệu của mục Điểm đến) */
function TileMock({ d }) {
  const loc = useLoc();
  return (
    <div className="arch relative aspect-[3/4] w-[calc(50%-0.375rem)] overflow-hidden bg-forest-900 opacity-80 shadow-sm md:w-[calc(25%-0.563rem)]">
      {d?.image && <Pic src={d.image} sizes="200px" />}
      <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <span className="absolute inset-x-0 bottom-0 p-2.5 text-[12px] leading-tight font-bold text-white">
        {d ? loc(d.name) : <span className="block h-3 w-16 rounded bg-white/30" />}
      </span>
    </div>
  );
}

function RegionBlock({ i, region, list }) {
  const loc = useLoc();
  const name = loc(region.name);
  const items = list?.filter((d) => d.region === region.slug && d.isActive !== false) ?? null;
  const count = items?.length ?? 0;
  return (
    <Sec
      name={`Miền ${i + 1} — ${region.short.vi}`}
      className={i % 2 ? "bg-cream-100" : "bg-cream-50"}
    >
      <header className="mx-auto mb-5 flex max-w-2xl flex-col items-center text-center">
        <p className="mb-2 flex items-center gap-1 text-[0.62rem] font-bold tracking-[0.18em] text-clay-600 uppercase">
          <span title="Số điểm đến tự đếm từ mục Điểm đến">{items ? count : "…"}</span>
          <Txt f="placesCount" />
        </p>
        <h3
          title="Tên miền cố định — không đổi được"
          className="flex items-center gap-1.5 text-xl leading-tight font-bold tracking-[-0.03em] text-ink sm:text-[1.65rem]"
        >
          {name}
          <Lock className="size-3.5 shrink-0 text-slate-400" />
        </h3>
        <Txt
          f={`regionIntros.${i}.intro`}
          label={`Lời giới thiệu ${region.name.vi}`}
          className="mt-2 text-xs text-balance text-ink/75 sm:text-[0.85rem]"
        />
        <span aria-hidden className="mt-3.5 block h-[3px] w-10 rounded-full bg-clay-500" />
      </header>
      <ModuleNote
        icon={MapPinned}
        title={`Các điểm đến ${region.name.vi}: tên, ảnh, số tour`}
        text={
          items
            ? count
              ? `Hiện tự động ${count} điểm đến của miền này, đúng thứ tự trong mục Điểm đến.`
              : "Miền này chưa có điểm đến nào đang hiện."
            : "Đang tải danh sách điểm đến…"
        }
        href={DEST_ADMIN}
        linkText="Sửa điểm đến ở mục Điểm đến"
      >
        <div className="mb-4 flex flex-wrap justify-center gap-3">
          {(items ?? Array.from({ length: TILES_SHOWN }, () => null))
            .slice(0, TILES_SHOWN)
            .map((d, k) => (
              <TileMock key={d?.slug ?? k} d={d} />
            ))}
        </div>
        {count > TILES_SHOWN && (
          <p className="-mt-2 mb-3 text-[11px] text-slate-500">
            … và {count - TILES_SHOWN} điểm đến khác
          </p>
        )}
      </ModuleNote>
    </Sec>
  );
}

export default function DestinationsPreview() {
  const list = useDestinations();
  const loc = useLoc();
  return (
    <>
      {/* ========== Đầu trang: dải 3 ảnh + tiêu đề nét cọ ========== */}
      <Sec name="Đầu trang" dark className="bg-brand-950 text-white sm:pb-12">
        <div className="absolute inset-0 -z-10 flex gap-[3px] bg-brand-950">
          {[0, 1, 2].map((i) => (
            <HeroTile key={i} i={i} />
          ))}
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/25 to-black/50" />
        {/* nút đổi ảnh: mỗi ảnh 1 thanh nút, đặt ở chân đúng ô ảnh đó */}
        <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-20 flex gap-[3px] px-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn("relative flex flex-1 justify-center", i > 0 && "hidden md:flex")}
            >
              <ImagePill
                f={`heroImages.${i}`}
                title={`Ảnh ${i + 1}`}
                floating={false}
                className="pointer-events-auto"
              />
            </div>
          ))}
        </div>
        <div className="flex min-h-[260px] flex-col items-center justify-center pb-10 text-center sm:min-h-[300px]">
          <p className="mb-3 flex max-w-full items-center gap-1 text-[11px] text-white/75">
            Vietlook <ChevronRight className="size-3 shrink-0" />{" "}
            <span className="truncate text-white">
              <Shown f="heroTitle" />
            </span>
          </p>
          <Txt
            f="heroTitle"
            dark
            className="brush text-2xl font-extrabold tracking-tight drop-shadow-md [--brush-color:var(--color-clay-600)] sm:text-[2.4rem]"
          />
          <Txt
            f="heroIntro"
            dark
            className="mt-4 max-w-2xl text-[13px] font-semibold drop-shadow-md sm:text-[15px]"
          />
        </div>
      </Sec>

      {/* ========== Thanh nhảy nhanh theo miền ========== */}
      <div className="border-b border-sand-300/60 bg-cream-50 px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {regions.map((r) => (
            <span
              key={r.slug}
              className="rounded-full px-3 py-1 text-xs font-semibold text-forest-700 ring-1 ring-sand-300"
            >
              {loc(r.short)}
            </span>
          ))}
        </div>
        <AutoNote className="mt-2">
          Tên 3 miền cố định (dùng ở menu, chân trang, form) — không đổi ở đây.
        </AutoNote>
      </div>

      {/* ========== 3 miền ========== */}
      <ListOf f="regionIntros">
        {(i) => regions[i] && <RegionBlock key={i} i={i} region={regions[i]} list={list} />}
      </ListOf>
    </>
  );
}
