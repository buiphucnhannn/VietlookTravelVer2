"use client";

import { useState } from "react";
import Image from "next/image";
import { FolderOpen, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { cn, slugify } from "@/lib/utils";
import { useAdminList, useMutation } from "./hooks";
import { DragHandle, PositionBadge, Sortable, usePagedSort } from "./Sortable";
import { AutoTranslate } from "./translate";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  ImageField,
  Input,
  LangTabs,
  LoadingBlock,
  LocInput,
  Modal,
  Notice,
  PageHeader,
  Pagination,
  Toggle,
  filledOf,
  locText,
  usePaged,
  useUi,
} from "./ui";
import VisibilityToggle from "./VisibilityToggle";

// đổi chuyên mục / tác giả → menu cẩm nang, trang chuyên mục, trang tác giả và thẻ bài viết đều đổi
const TAGS = ["taxonomy", "articles"];

const loc = () => ({ en: "", zh: "", vi: "" });

const KINDS = {
  category: {
    path: "/admin/categories",
    title: "Chuyên mục",
    noun: "chuyên mục",
    description: "Nhóm bài viết, hiện ở menu cẩm nang du lịch.",
    icon: FolderOpen,
    // tên chuyên mục là chữ thường → dịch được
    skipKeys: [],
    empty: () => ({
      slug: "",
      name: loc(),
      description: loc(),
      group: "",
      icon: "",
      order: 0,
      isActive: true,
    }),
    toPayload: (d) => ({
      slug: d.slug,
      name: d.name,
      description: d.description,
      group: d.group,
      icon: d.icon,
      order: Number(d.order) || 0,
      isActive: d.isActive,
    }),
    deleteNote:
      "Chuyên mục đang có bài viết thì không xoá được — hãy chuyển bài sang chuyên mục khác hoặc ẩn chuyên mục.",
  },
  author: {
    path: "/admin/authors",
    title: "Tác giả",
    noun: "tác giả",
    description: "Người viết, hiện ở cuối mỗi bài viết.",
    icon: UserRound,
    // họ tên là tên riêng → không dịch (chỉ dịch vai trò và giới thiệu)
    skipKeys: ["name"],
    empty: () => ({
      slug: "",
      name: loc(),
      role: loc(),
      bio: loc(),
      avatar: "",
      order: 0,
      isActive: true,
    }),
    toPayload: (d) => ({
      slug: d.slug,
      name: d.name,
      role: d.role,
      bio: d.bio,
      avatar: d.avatar,
      order: Number(d.order) || 0,
      isActive: d.isActive,
    }),
    deleteNote: "Bài viết của tác giả này sẽ không còn hiện tên tác giả.",
  },
};

export default function TaxonomyPage() {
  return (
    <>
      <PageHeader
        title="Chuyên mục & tác giả"
        description="Phân loại bài viết trong cẩm nang du lịch. Giữ nút 6 chấm ở đầu dòng và kéo để đổi thứ tự, hoặc bấm số thứ tự để chuyển nhanh tới vị trí bất kỳ."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <TaxonomyCard kind="category" />
        <TaxonomyCard kind="author" />
      </div>
    </>
  );
}

function TaxonomyCard({ kind }) {
  const cfg = KINDS[kind];
  const { confirm } = useUi();
  const list = useAdminList(cfg.path, { limit: 200, sort: "order" });
  const [editing, setEditing] = useState(null);
  const { run } = useMutation(TAGS);
  const paged = usePaged(list.items, PAGE_SIZE);

  /** Lưu thứ tự mới của danh sách đầy đủ (sau khi kéo – thả hoặc chuyển tới vị trí khác) */
  const reorder = async (next) => {
    const before = list.items;
    const ordered = next.map((x, i) => ({ ...x, order: i }));
    list.setItems(() => ordered);
    const ok = await run(
      () =>
        api(`${cfg.path}/order`, {
          method: "PATCH",
          body: { items: ordered.map((x) => ({ id: x.id, order: x.order })) },
        }),
      "Đã lưu thứ tự mới",
    );
    if (!ok) list.setItems(() => before);
  };
  const sort = usePagedSort({ all: list.items, paged, onReorder: reorder });
  const nextOrder = list.items.reduce((m, x) => Math.max(m, (Number(x.order) || 0) + 1), 0);

  const remove = async (d) => {
    const ok = await confirm({
      title: `Xoá ${cfg.noun}?`,
      message: `"${locText(d.name)}" sẽ bị xoá. ${cfg.deleteNote}`,
      confirmText: "Xoá",
      danger: true,
    });
    if (!ok) return;
    if (await run(() => api(`${cfg.path}/${d.id}`, { method: "DELETE" }), `Đã xoá ${cfg.noun}`))
      list.reload();
  };

  return (
    <Card
      title={cfg.title}
      description={cfg.description}
      icon={cfg.icon}
      bodyClassName="p-0 sm:p-0"
      actions={
        <Button
          size="sm"
          icon={Plus}
          onClick={() => setEditing({ ...cfg.empty(), order: nextOrder })}
        >
          Thêm {cfg.noun}
        </Button>
      }
    >
      {list.error && (
        <Notice tone="error" className="m-4">
          {list.error}
        </Notice>
      )}
      {list.loading && !list.items.length ? (
        <LoadingBlock />
      ) : !list.items.length ? (
        <EmptyState icon={cfg.icon} title={`Chưa có ${cfg.noun}`} />
      ) : (
        <Sortable
          items={paged.items}
          getId={byId}
          onReorder={sort.onPageReorder}
          highlight={sort.flash}
          className="divide-y divide-slate-100"
        >
          {(d, i, drag) => (
            <div
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-2 bg-white py-3 pr-4 pl-2 sm:pr-5 sm:pl-3",
                drag.dragging && "ring-1 ring-brand-300",
              )}
            >
              <span className="flex shrink-0 items-center gap-1">
                <DragHandle {...drag.handle} />
                <PositionBadge {...sort.badge(d, i)} />
              </span>
              {kind === "author" && (
                <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-50 text-brand-600">
                  {d.avatar ? (
                    <Image src={d.avatar} alt="" fill sizes="40px" className="object-cover" />
                  ) : (
                    <UserRound className="size-5" />
                  )}
                </span>
              )}
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate font-semibold text-slate-900">{locText(d.name) || d.slug}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  {kind === "author" && locText(d.role) && <span>{locText(d.role)}</span>}
                  {kind === "category" && (
                    <span className="line-clamp-1">
                      {locText(d.description) || "Chưa có mô tả"}
                    </span>
                  )}
                  {!d.name?.zh && <Badge tone="amber">Thiếu bản 中文</Badge>}
                  {!d.name?.vi && <Badge tone="amber">Thiếu bản VI</Badge>}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <VisibilityToggle
                  path={cfg.path}
                  item={d}
                  tags={TAGS}
                  onDone={(doc) =>
                    list.setItems((xs) => xs.map((x) => (x.id === doc.id ? doc : x)))
                  }
                />
                <Button variant="ghost" size="icon" onClick={() => setEditing(d)} aria-label="Sửa">
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(d)}
                  aria-label="Xoá"
                  className="text-sun-600"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </Sortable>
      )}
      <Pagination meta={paged.meta} onPage={paged.setPage} unit={cfg.noun} />

      {editing && (
        <TaxonomyEditor
          kind={kind}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}
    </Card>
  );
}

const PAGE_SIZE = 8;
const byId = (x) => x.id;

function TaxonomyEditor({ kind, initial, onClose, onSaved }) {
  const cfg = KINDS[kind];
  const isNew = !initial.id;
  const base = cfg.empty();
  const [d, setD] = useState(() => {
    const merged = { ...base, ...initial };
    for (const k of Object.keys(base))
      if (base[k] && typeof base[k] === "object") merged[k] = { ...base[k], ...initial[k] };
    return merged;
  });
  const [lang, setLang] = useState("en");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const { toast } = useUi();
  const { run, busy } = useMutation(TAGS);
  const set = (patch) => setD((x) => ({ ...x, ...patch }));

  const save = async () => {
    if (!d.name.en.trim()) {
      setLang("en");
      return toast("Cần nhập tên tiếng Anh", "error");
    }
    if (!d.slug) return toast("Cần nhập đường dẫn trang", "error");
    const body = cfg.toPayload(d);
    const ok = await run(
      () =>
        isNew
          ? api(cfg.path, { method: "POST", body })
          : api(`${cfg.path}/${d.id}`, { method: "PUT", body }),
      isNew ? `Đã thêm ${cfg.noun}` : `Đã lưu ${cfg.noun}`,
    );
    if (ok) onSaved();
  };

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={isNew ? `Thêm ${cfg.noun}` : `Sửa: ${locText(initial.name)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={save} loading={busy}>
            Lưu
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-700">Nội dung theo ngôn ngữ</p>
          <div className="flex items-center gap-2">
            <AutoTranslate
              lang={lang}
              value={d}
              skipKeys={cfg.skipKeys}
              onChange={(next) =>
                setD({
                  ...next,
                  ...(!slugTouched &&
                    !next.slug &&
                    next.name.en && { slug: slugify(next.name.en) }),
                })
              }
              className="rounded-full"
              label={
                <>
                  <span className="sm:hidden">Dịch</span>
                  <span className="hidden sm:inline">Dịch tự động</span>
                </>
              }
            />
            <LangTabs value={lang} onChange={setLang} filled={filledOf(d.name)} />
          </div>
        </div>
        <Field label={kind === "author" ? "Họ tên" : "Tên chuyên mục"} required={lang === "en"}>
          <LocInput
            value={d.name}
            lang={lang}
            onChange={(name) =>
              set({ name, ...(!slugTouched && lang === "en" && { slug: slugify(name.en) }) })
            }
          />
        </Field>
        <Field label="Đường dẫn trang" required hint="Phần cuối của địa chỉ trang, viết không dấu">
          <Input
            value={d.slug}
            className="font-mono text-[13px]"
            onChange={(e) => {
              setSlugTouched(true);
              set({ slug: slugify(e.target.value) });
            }}
          />
        </Field>

        {kind === "category" ? (
          <>
            <Field label="Mô tả" hint="Hiện ở đầu trang chuyên mục">
              <LocInput
                value={d.description}
                lang={lang}
                multiline
                rows={3}
                onChange={(description) => set({ description })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nhóm trên menu" hint="Vd: essentials, transport. Có thể để trống.">
                <Input value={d.group} onChange={(e) => set({ group: e.target.value.trim() })} />
              </Field>
              <Field label="Biểu tượng" hint="Tên biểu tượng, vd: plane, map. Có thể để trống.">
                <Input value={d.icon} onChange={(e) => set({ icon: e.target.value.trim() })} />
              </Field>
            </div>
          </>
        ) : (
          <>
            <Field label="Vai trò" hint="VD: Travel Writer, Tour Expert">
              <LocInput value={d.role} lang={lang} onChange={(role) => set({ role })} />
            </Field>
            <Field label="Giới thiệu ngắn">
              <LocInput
                value={d.bio}
                lang={lang}
                multiline
                rows={4}
                onChange={(bio) => set({ bio })}
              />
            </Field>
            <Field label="Ảnh đại diện" hint="Ảnh vuông, tối thiểu 400px">
              <div className="max-w-[180px]">
                <ImageField
                  value={d.avatar}
                  onChange={(avatar) => set({ avatar })}
                  folder="authors"
                  aspect="aspect-square"
                  crop={{ width: 400 }}
                />
              </div>
            </Field>
          </>
        )}

        <Toggle
          checked={d.isActive}
          onChange={(isActive) => set({ isActive })}
          label="Hiện trên website"
        />
      </div>
    </Modal>
  );
}
