"use client";

import Image from "next/image";
import Link from "@/components/admin/Link";
import { Eye, Newspaper, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { ADMIN_BASE } from "@/config/urls.mjs";
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
  fmtDate,
  locText,
  useUi,
} from "./ui";
import VisibilityToggle from "./VisibilityToggle";
import { usePermission } from "./permissions";

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
  const { confirm } = useUi();
  const { canEdit, canDelete } = usePermission("articles");
  const list = useAdminList(PATH, { q: "", category: "", status: "", sort: "newest", limit: 15 });
  const categories = useOptions("/admin/categories?limit=200&sort=order", (c) => ({
    value: c.slug,
    label: locText(c.name) || c.slug,
  }));
  const catLabel = (slug) => categories.find((c) => c.value === slug)?.label ?? slug;
  const { run } = useMutation(TAGS);

  const remove = async (a) => {
    const ok = await confirm({
      title: "Xoá bài viết?",
      message: `Bài "${locText(a.title)}" sẽ bị xoá và không khôi phục được. Nếu chỉ muốn tạm gỡ khỏi website, hãy ẩn bài thay vì xoá.`,
      confirmText: "Xoá",
      danger: true,
    });
    if (!ok) return;
    if (await run(() => api(`${PATH}/${a.id}`, { method: "DELETE" }), "Đã xoá bài viết"))
      list.reload();
  };

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
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_220px_170px_150px]">
          <SearchBox
            value={list.query.q}
            onChange={(q) => list.setQuery({ q })}
            placeholder="Tìm theo tiêu đề…"
            className="col-span-2 lg:col-span-1"
          />
          <Select
            value={list.query.category}
            onChange={(e) => list.setQuery({ category: e.target.value })}
            className="col-span-2 sm:col-span-1"
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
            title="Không có bài viết nào"
            text={
              list.query.q || list.query.category || list.query.status
                ? "Thử đổi từ khoá hoặc bộ lọc."
                : "Bấm “Viết bài mới” để đăng bài đầu tiên."
            }
          />
        ) : (
          <BusyArea busy={list.loading}>
            <ul className="divide-y divide-slate-100">
              {list.items.map((a) => (
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
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(a)}
                        aria-label="Xoá"
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
