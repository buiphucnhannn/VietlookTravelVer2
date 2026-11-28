"use client";

import Image from "next/image";
import Link from "@/components/admin/Link";
import { Eye, Newspaper, Pencil, Plus, Trash2 } from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { useAdminList, useOptions } from "./hooks";
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
  fmtDate,
  locText,
} from "./ui";
import VisibilityToggle from "./VisibilityToggle";
import { usePermission } from "./permissions";
import {
  FilterBar,
  TrashActions,
  TrashTabs,
  ViewOnSiteLink,
  trashNote,
  useTrash,
} from "./catalogShared";

const PATH = "/admin/articles";
const TAGS = ["articles"];
const BASE = `${ADMIN_BASE}/articles`;

/** Có nội dung ở ngôn ngữ này? Danh sách chỉ nhận true / false (không tải HTML); bài vừa sửa có thể là HTML */
const hasBody = (v) => v === true || (typeof v === "string" && Boolean(v.trim()));

/** Ngôn ngữ còn thiếu (tiêu đề hoặc nội dung trống) — website tạm dùng ngôn ngữ khác đã có */
const missingLangs = (a) =>
  [
    { key: "vi", label: "VI" },
    { key: "en", label: "EN" },
    { key: "zh", label: "中文" },
  ].filter((l) => !a.title?.[l.key]?.trim() || !hasBody(a.body?.[l.key]));

export default function ArticlesPage() {
  const { canEdit, canDelete } = usePermission("articles");
  const list = useAdminList(PATH, {
    q: "",
    category: "",
    status: "",
    sort: "newest",
    trash: "",
    limit: 15,
  });
  const inTrash = list.query.trash === "1";
  const filterCount = ["category", "status"].filter((k) => list.query[k]).length;
  const resetFilters = () => list.setQuery({ category: "", status: "" });
  const categories = useOptions("/admin/categories?limit=200&sort=order", (c) => ({
    value: c.slug,
    label: locText(c.name) || c.slug,
  }));
  const catLabel = (slug) => categories.find((c) => c.value === slug)?.label ?? slug;
  // Xoá → Thùng rác 30 ngày (kèm "Hoàn tác")
  const trash = useTrash({
    path: PATH,
    tags: TAGS,
    noun: "bài viết",
    nameOf: (a) => locText(a.title) || "(Chưa có tiêu đề)",
    onChange: list.reload,
  });
  const showTrash = (on) => list.setQuery({ trash: on ? "1" : "", category: "", status: "" });

  return (
    <>
      <PageHeader
        title="Bài viết"
        description="Các bài cẩm nang du lịch trên website. Viết bằng một ngôn ngữ bất kỳ — khi lưu, các ngôn ngữ còn lại tự được dịch."
        actions={
          canEdit && (
            <Link
              href={`${BASE}/new`}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
            >
              <Plus className="size-4" />
              Viết bài mới
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
              activeLabel="Bài đang có"
            />
          )}
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <SearchBox
              value={list.query.q}
              onChange={(q) => list.setQuery({ q })}
              placeholder={inTrash ? "Tìm trong Thùng rác theo tiêu đề…" : "Tìm theo tiêu đề…"}
            />
            {!inTrash && (
              <FilterBar
                count={filterCount}
                onReset={resetFilters}
                gridClass="gap-3 sm:grid-cols-3 lg:grid-cols-[220px_170px_150px]"
              >
                <Select
                  value={list.query.category}
                  onChange={(e) => list.setQuery({ category: e.target.value })}
                  aria-label="Lọc theo chuyên mục"
                >
                  <option value="">Tất cả chuyên mục</option>
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
                <Select
                  value={list.query.status}
                  onChange={(e) => list.setQuery({ status: e.target.value })}
                  aria-label="Lọc theo trạng thái"
                >
                  <option value="">Mọi trạng thái</option>
                  <option value="active">Đang hiện</option>
                  <option value="hidden">Đang ẩn</option>
                </Select>
                <Select
                  value={list.query.sort}
                  onChange={(e) => list.setQuery({ sort: e.target.value })}
                  aria-label="Sắp xếp"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="oldest">Cũ nhất</option>
                  <option value="name">Theo tên</option>
                </Select>
              </FilterBar>
            )}
          </div>
          {inTrash && list.meta && (
            <p className="text-xs text-slate-500">
              {list.meta.total} bài trong Thùng rác — tự xoá hẳn sau 30 ngày
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
            icon={Newspaper}
            title={inTrash ? "Thùng rác trống" : "Không có bài viết nào"}
            text={
              inTrash
                ? "Bài bị xoá sẽ nằm ở đây 30 ngày, khôi phục được bất cứ lúc nào."
                : list.query.q || list.query.category || list.query.status
                  ? "Thử đổi từ khoá hoặc bộ lọc."
                  : "Bấm “Viết bài mới” để đăng bài đầu tiên."
            }
          />
        ) : (
          <BusyArea busy={list.loading}>
            <ul className="divide-y divide-slate-100">
              {inTrash &&
                list.items.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-4 px-4 py-3.5 sm:px-5">
                    <span className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      {a.image && (
                        <Image
                          src={a.image}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover opacity-70 grayscale"
                        />
                      )}
                    </span>
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="line-clamp-2 font-semibold text-slate-700">
                        {locText(a.title) || "(Chưa có tiêu đề)"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{trashNote(a.deletedAt)}</p>
                    </div>
                    <TrashActions
                      busy={trash.busy}
                      onRestore={() => trash.restore(a)}
                      onPurge={() => trash.purge(a)}
                      className="max-sm:w-full max-sm:justify-end"
                    />
                  </li>
                ))}
              {!inTrash &&
                list.items.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-4 px-4 py-3.5 sm:px-5">
                    <Link
                      href={`${BASE}/${a.id}`}
                      className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100"
                    >
                      {a.image && (
                        <Image src={a.image} alt="" fill sizes="80px" className="object-cover" />
                      )}
                    </Link>
                    <div className="min-w-0 flex-1 basis-56">
                      <Link
                        href={`${BASE}/${a.id}`}
                        className="line-clamp-2 font-semibold text-slate-900 hover:text-brand-700"
                      >
                        {locText(a.title) || "(Chưa có tiêu đề)"}
                      </Link>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {a.category ? (
                          <Badge tone="blue">{catLabel(a.category)}</Badge>
                        ) : (
                          <Badge>Chưa có chuyên mục</Badge>
                        )}
                        <span>{fmtDate(a.publishedAt)}</span>
                        {missingLangs(a).map((l) => (
                          <Badge key={l.key} tone="amber">
                            Thiếu bản {l.label}
                          </Badge>
                        ))}
                      </p>
                    </div>
                    <VisibilityToggle
                      path={PATH}
                      item={a}
                      tags={TAGS}
                      onDone={(doc) =>
                        list.setItems((xs) => xs.map((x) => (x.id === doc.id ? doc : x)))
                      }
                    />
                    <div className="flex gap-1">
                      <Link
                        href={`${BASE}/${a.id}`}
                        aria-label={canEdit ? "Sửa" : "Xem"}
                        title={canEdit ? "Sửa" : "Xem"}
                        className="grid size-9 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        {canEdit ? <Pencil className="size-4" /> : <Eye className="size-4" />}
                      </Link>
                      <ViewOnSiteLink href={`/travel-guide/${a.slug}`} visible={a.isActive} />
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => trash.remove(a)}
                          aria-label="Xoá"
                          title="Xoá"
                          className="text-sun-600"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          </BusyArea>
        )}
        <Pagination
          meta={list.meta}
          unit="bài viết"
          onPage={(page) => {
            list.setQuery({ page });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </Card>
    </>
  );
}
