"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "@/components/admin/Link";
import { useRouter } from "next/navigation";
import { Copy, Eye, Map as MapIcon, Pencil, Plus, Ship, Trash2 } from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { api, ApiError } from "@/lib/api";
import { useAdminList, useMutation, useOptions } from "./hooks";
import {
  Badge,
  BusyArea,
  Button,
  Card,
  EmptyState,
  LoadingBlock,
  Notice,
  PageHeader,
  Pagination,
  SearchBox,
  Select,
  fmtUSD,
  locText,
} from "./ui";
import VisibilityToggle from "./VisibilityToggle";
import { REGIONS } from "./DestinationsPage";
import { usePermission } from "./permissions";
import {
  FilterBar,
  TrashActions,
  TrashTabs,
  ViewOnSiteLink,
  trashNote,
  useTrash,
} from "./catalogShared";

const PATH = "/admin/tours";
const TAGS = ["tours"];

// Điện thoại: ô lọc 2 cột hẹp → bớt khoảng đệm để chữ không bị cắt
const FILTER = "max-sm:bg-[right_10px_center] max-sm:pr-8 max-sm:pl-3";

const SORTS = [
  { value: "rank", label: "Thứ tự hiển thị" },
  { value: "newest", label: "Mới nhất" },
  { value: "price", label: "Giá thấp → cao" },
  { value: "name", label: "Tên A → Z" },
];

/** Tên tour để hiển thị trong CMS (ưu tiên tiếng Việt, không có thì tiếng Anh) */
export const tourTitle = (t) =>
  locText({ en: t?.content?.en?.title, zh: t?.content?.zh?.title, vi: t?.content?.vi?.title }) ||
  t?.slug ||
  "(chưa có tên)";

export const durationText = (t) => {
  if (t?.halfDay) return "Nửa ngày";
  const d = Number(t?.days) || 0;
  const n = Number(t?.nights) || 0;
  if (!d) return "";
  return n ? `${d} ngày ${n} đêm` : `${d} ngày`;
};

export default function ToursPage() {
  const router = useRouter();
  const { canEdit, canDelete } = usePermission("tours");
  const list = useAdminList(PATH, {
    q: "",
    region: "",
    destination: "",
    theme: "",
    status: "",
    featured: "",
    sort: "rank",
    trash: "",
    limit: 20,
  });
  const inTrash = list.query.trash === "1";
  const { run } = useMutation(TAGS);
  const [copying, setCopying] = useState(null);

  const destinations = useOptions("/admin/destinations?limit=200&sort=order", (d) => ({
    value: d.slug,
    label: locText(d.name) || d.slug,
    region: d.region,
  }));
  const themes = useOptions("/admin/themes?limit=50&sort=order", (t) => ({
    value: t.slug,
    label: locText(t.name) || t.slug,
  }));
  const destOptions = list.query.region
    ? destinations.filter((d) => d.region === list.query.region)
    : destinations;

  const FILTER_KEYS = ["region", "destination", "theme", "status", "featured"];
  const filterCount = FILTER_KEYS.filter((k) => list.query[k]).length;
  const hasFilter = list.query.q || filterCount > 0;
  const resetFilters = () => list.setQuery(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])));

  // Xoá → Thùng rác 30 ngày (kèm "Hoàn tác"); trang chủ cũng bỏ tour này (máy chủ đã gỡ) → xoá cache trang chủ
  const trash = useTrash({
    path: PATH,
    tags: TAGS,
    noun: "tour",
    nameOf: tourTitle,
    onChange: list.reload,
    removeExtraTags: ["settings"],
  });
  const showTrash = (on) =>
    list.setQuery({ trash: on ? "1" : "", ...Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])) });

  /** Nhân bản: tạo bản sao (đang ẩn) với đường dẫn thêm "-copy", rồi mở trang sửa bản sao */
  const duplicate = async (t) => {
    setCopying(t.id);
    const created = await run(async () => {
      const [{ toTourPayload, normalizeTour }, full] = await Promise.all([
        import("./TourEditor"),
        api(`${PATH}/${t.id}`),
      ]);
      const base = toTourPayload(normalizeTour(full.data));
      for (let i = 1; i <= 8; i++) {
        const slug = `${base.slug}-copy${i > 1 ? `-${i}` : ""}`.slice(0, 120);
        const code = base.code ? `${base.code}-COPY`.slice(0, 30) : "";
        try {
          return await api(PATH, {
            method: "POST",
            body: { ...base, slug, code, isActive: false, featured: false, featuredLong: false },
          });
        } catch (err) {
          if (!(err instanceof ApiError) || err.status !== 409) throw err;
        }
      }
      throw new ApiError(409, { error: { message: "Đã có quá nhiều bản sao của tour này" } });
    }, "Đã nhân bản tour (bản sao đang ẩn)");
    setCopying(null);
    if (created?.data?.id) router.push(`${ADMIN_BASE}/tours/${created.data.id}`);
    else if (created) list.reload();
  };

  return (
    <>
      <PageHeader
        title="Tour"
        description="Thêm, sửa, ẩn hoặc nhân bản các tour đang có trên website."
        actions={
          canEdit && (
            <Link
              href={`${ADMIN_BASE}/tours/new`}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
            >
              <Plus className="size-4" /> Thêm tour
            </Link>
          )
        }
      />

      <Card bodyClassName="p-0 sm:p-0">
        <div className="space-y-3 border-b border-slate-100 p-4 sm:px-5">
          {canDelete && (
            <TrashTabs
              trash={inTrash}
              onChange={showTrash}
              countUrl={`${PATH}?trash=1&limit=1`}
              activeLabel="Tour đang có"
            />
          )}
          <SearchBox
            value={list.query.q}
            onChange={(q) => list.setQuery({ q })}
            placeholder={
              inTrash
                ? "Tìm trong Thùng rác theo tên hoặc mã tour…"
                : "Tìm theo tên tour hoặc mã tour…"
            }
          />
          {!inTrash && (
            <FilterBar
              count={filterCount}
              onReset={resetFilters}
              gridClass="gap-2 sm:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_minmax(15rem,1.35fr)]"
            >
              <Select
                value={list.query.region}
                onChange={(e) => list.setQuery({ region: e.target.value, destination: "" })}
                aria-label="Miền"
                className={FILTER}
              >
                <option value="">Mọi miền</option>
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
              <Select
                value={list.query.destination}
                onChange={(e) => list.setQuery({ destination: e.target.value })}
                aria-label="Điểm đến"
                className={FILTER}
              >
                <option value="">Mọi điểm đến</option>
                {destOptions.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Select>
              <Select
                value={list.query.theme}
                onChange={(e) => list.setQuery({ theme: e.target.value })}
                aria-label="Chủ đề"
                className={FILTER}
              >
                <option value="">Mọi chủ đề</option>
                {themes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <Select
                value={list.query.status}
                onChange={(e) => list.setQuery({ status: e.target.value })}
                aria-label="Trạng thái"
                className={FILTER}
              >
                <option value="">Mọi trạng thái</option>
                <option value="active">Đang hiện</option>
                <option value="hidden">Đang ẩn</option>
              </Select>
              <Select
                value={list.query.featured}
                onChange={(e) => list.setQuery({ featured: e.target.value })}
                aria-label="Nổi bật"
                className={FILTER}
              >
                <option value="">Mọi loại tour</option>
                <option value="featured">Tour nổi bật</option>
                <option value="long">Tour dài ngày nổi bật</option>
              </Select>
              <Select
                value={list.query.sort}
                onChange={(e) => list.setQuery({ sort: e.target.value })}
                aria-label="Sắp xếp"
                className={FILTER}
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    Sắp xếp: {s.label}
                  </option>
                ))}
              </Select>
            </FilterBar>
          )}
          {list.meta && (
            <p className="text-xs text-slate-500">
              {inTrash
                ? `${list.meta.total} tour trong Thùng rác — tự xoá hẳn sau 30 ngày`
                : `${list.meta.total} tour${hasFilter ? " phù hợp bộ lọc" : ""}`}
            </p>
          )}
        </div>

        {list.error && (
          <Notice tone="error" className="m-4">
            {list.error}
          </Notice>
        )}
        {list.loading && !list.items.length ? (
          <LoadingBlock />
        ) : !list.items.length ? (
          <EmptyState
            icon={MapIcon}
            title={
              inTrash ? "Thùng rác trống" : hasFilter ? "Không có tour phù hợp" : "Chưa có tour"
            }
            text={
              inTrash
                ? "Tour bị xoá sẽ nằm ở đây 30 ngày, khôi phục được bất cứ lúc nào."
                : hasFilter
                  ? "Thử đổi từ khoá hoặc bỏ bớt bộ lọc."
                  : "Thêm tour đầu tiên để bắt đầu bán."
            }
          />
        ) : (
          <BusyArea busy={list.loading}>
            <ul className="divide-y divide-slate-100">
              {inTrash &&
                list.items.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:px-5"
                  >
                    <span className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-24">
                      {t.image && (
                        <Image
                          src={t.image}
                          alt=""
                          fill
                          sizes="96px"
                          className="object-cover opacity-70 grayscale"
                        />
                      )}
                    </span>
                    <div className="min-w-0 flex-1 basis-40 sm:basis-56">
                      <p className="line-clamp-2 font-semibold text-slate-700">{tourTitle(t)}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                        {t.code && <span className="font-mono font-semibold">{t.code}</span>}
                        <span>{trashNote(t.deletedAt)}</span>
                      </p>
                    </div>
                    <TrashActions
                      busy={trash.busy}
                      onRestore={() => trash.restore(t)}
                      onPurge={() => trash.purge(t)}
                      className="max-sm:w-full max-sm:justify-end"
                    />
                  </li>
                ))}
              {!inTrash &&
                list.items.map((t) => {
                  const href = `${ADMIN_BASE}/tours/${t.id}`;
                  const strike = t.originalPrice > (t.price ?? 0) ? t.originalPrice : null;
                  return (
                    <li
                      key={t.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:px-5"
                    >
                      <Link
                        href={href}
                        className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-24"
                      >
                        {t.image && (
                          <Image src={t.image} alt="" fill sizes="96px" className="object-cover" />
                        )}
                      </Link>
                      <div className="min-w-0 flex-1 basis-40 sm:basis-56">
                        <Link
                          href={href}
                          className="line-clamp-2 font-semibold text-slate-900 hover:text-brand-700"
                        >
                          {tourTitle(t)}
                        </Link>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                          {t.code && (
                            <span className="font-mono font-semibold text-slate-600">{t.code}</span>
                          )}
                          {durationText(t) && <span>{durationText(t)}</span>}
                          {t.tourType && (
                            <span>{t.tourType === "group" ? "Tour ghép" : "Tour riêng"}</span>
                          )}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {t.featured && <Badge tone="blue">Nổi bật</Badge>}
                          {t.featuredLong && <Badge tone="violet">Dài ngày</Badge>}
                          {t.cruise && (
                            <Badge tone="gray">
                              <Ship className="size-3" /> Du thuyền
                            </Badge>
                          )}
                          {!t.content?.zh?.title && <Badge tone="amber">Chưa có tiếng Trung</Badge>}
                          {!t.content?.vi?.title && <Badge tone="amber">Chưa có tiếng Việt</Badge>}
                          {!t.image && <Badge tone="red">Chưa có ảnh</Badge>}
                        </div>
                      </div>
                      {/* Điện thoại: giá + nút thao tác chung 1 hàng dưới tên tour */}
                      <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-4">
                        <div className="sm:w-24 sm:text-right">
                          <p className="font-bold text-slate-900">
                            {t.price ? fmtUSD(t.price) : "Liên hệ"}
                          </p>
                          {strike && (
                            <p className="text-xs text-slate-400 line-through">{fmtUSD(strike)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <VisibilityToggle
                            path={PATH}
                            item={t}
                            tags={TAGS}
                            onDone={(doc) =>
                              list.setItems((xs) =>
                                xs.map((x) => (x.id === doc.id ? { ...x, ...doc } : x)),
                              )
                            }
                          />
                          <Link
                            href={href}
                            aria-label={canEdit ? "Sửa" : "Xem"}
                            title={canEdit ? "Sửa" : "Xem"}
                            className="grid size-9 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                          >
                            {canEdit ? <Pencil className="size-4" /> : <Eye className="size-4" />}
                          </Link>
                          <ViewOnSiteLink href={`/tours/${t.slug}`} visible={t.isActive} />
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => duplicate(t)}
                              loading={copying === t.id}
                              disabled={!!copying}
                              aria-label="Nhân bản"
                              title="Nhân bản"
                            >
                              {copying !== t.id && <Copy className="size-4" />}
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => trash.remove(t)}
                              aria-label="Xoá"
                              title="Xoá"
                              className="text-sun-600"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </BusyArea>
        )}
        <Pagination
          meta={list.meta}
          unit="tour"
          onPage={(page) => {
            list.setQuery({ page });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </Card>
    </>
  );
}
