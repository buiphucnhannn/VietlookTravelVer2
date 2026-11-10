"use client";

import { useState } from "react";
import { Plus, Shapes } from "lucide-react";
import { api } from "@/lib/api";
import { slugify } from "@/lib/utils";
import {
  CARD_GRID,
  EditorModal,
  FormSection,
  ItemActions,
  LangBar,
  MediaCard,
  useRemove,
  useReorder,
  useEditVerb,
} from "./catalogShared";
import { useAdminList, useMutation } from "./hooks";
import { Sortable, usePagedSort } from "./Sortable";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  ImageField,
  Input,
  LoadingBlock,
  LocInput,
  Notice,
  PageHeader,
  Pagination,
  DEFAULT_LANG,
  Toggle,
  anyLang,
  locText,
  usePaged,
  useUi,
} from "./ui";
import { usePermission } from "./permissions";
import { slugSource, useAutoFill } from "./translate";

const PATH = "/admin/themes";
// chủ đề thay đổi → menu, trang chủ, trang chủ đề, bộ lọc tour đều đổi
const TAGS = ["themes", "tours"];
const MAX = 8;
const PAGE_SIZE = 8; // 2 hàng × 4 cột

const L = () => ({ en: "", zh: "", vi: "" });

const EMPTY = {
  slug: "",
  name: L(),
  tagline: L(),
  intro: L(),
  image: "",
  banner: "",
  order: 0,
  isActive: true,
};

const toPayload = (d) => ({
  slug: d.slug,
  name: d.name,
  tagline: d.tagline,
  intro: d.intro,
  image: d.image,
  banner: d.banner,
  order: Number(d.order) || 0,
  isActive: d.isActive,
});

export default function ThemesPage() {
  const { canEdit } = usePermission("themes");
  const list = useAdminList(PATH, { limit: 50, sort: "order" });
  const [editing, setEditing] = useState(null);
  const remove = useRemove(
    PATH,
    "chủ đề",
    TAGS,
    list.reload,
    "Chủ đề đang gắn với tour thì không xoá được — hãy ẩn thay vì xoá.",
  );
  const reorder = useReorder(list, PATH, TAGS);
  const paged = usePaged(list.items, PAGE_SIZE);
  const sort = usePagedSort({ all: list.items, paged, onReorder: reorder });
  const count = list.meta?.total ?? list.items.length;
  const full = count >= MAX;
  const patch = (doc) => list.setItems((xs) => xs.map((x) => (x.id === doc.id ? doc : x)));

  return (
    <>
      <PageHeader
        title="Chủ đề tour"
        description={`Tối đa 8 chủ đề (VD: Gia đình, Ẩm thực, Mạo hiểm). Hiện trên menu, trang chủ, bộ lọc tour và trang chủ đề.${canEdit ? " Giữ và kéo thẻ để đổi thứ tự, hoặc bấm số thứ tự trên thẻ để chuyển nhanh tới vị trí bất kỳ." : ""}`}
        actions={
          <>
            <Badge tone={full ? "amber" : "blue"} className="px-3 py-1 text-xs">
              {count}/{MAX} chủ đề
            </Badge>
            {canEdit && (
              <Button icon={Plus} onClick={() => setEditing(EMPTY)} disabled={full}>
                Thêm chủ đề
              </Button>
            )}
          </>
        }
      />

      {full && canEdit && (
        <Notice tone="warn" className="mb-4">
          Đã đủ {MAX} chủ đề. Muốn thêm chủ đề mới, hãy xoá bớt hoặc sửa lại một chủ đề cũ.
        </Notice>
      )}

      <Card bodyClassName="p-4 sm:p-5">
        {list.error && (
          <Notice tone="error" className="mb-4">
            {list.error}
          </Notice>
        )}
        {list.loading && !list.items.length ? (
          <LoadingBlock />
        ) : !list.items.length ? (
          <EmptyState
            icon={Shapes}
            title="Chưa có chủ đề"
            text="Thêm chủ đề đầu tiên để phân loại tour."
          />
        ) : (
          <Sortable
            items={paged.items}
            getId={(t) => t.id}
            layout="grid"
            className={CARD_GRID}
            onReorder={sort.onPageReorder}
            highlight={sort.flash}
            disabled={!canEdit}
          >
            {(t, i, drag) => (
              <MediaCard
                image={t.image}
                drag={drag}
                position={sort.badge(t, i)}
                dimmed={!t.isActive}
                badges={
                  <>
                    {!t.image && <Badge tone="red">Chưa có ảnh</Badge>}
                    {!t.name?.zh && <Badge tone="amber">Thiếu bản 中文</Badge>}
                  </>
                }
                actions={
                  <ItemActions
                    path={PATH}
                    item={t}
                    tags={TAGS}
                    onDone={patch}
                    onEdit={() => setEditing(t)}
                    onRemove={() => remove(t)}
                  />
                }
              >
                <p className="truncate font-semibold text-slate-900">{locText(t.name)}</p>
                <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-slate-500">
                  {locText(t.tagline) || "Chưa có câu giới thiệu"}
                </p>
              </MediaCard>
            )}
          </Sortable>
        )}
        <Pagination bare unit="chủ đề" meta={paged.meta} onPage={paged.setPage} />
      </Card>

      {editing && (
        <ThemeEditor
          initial={editing}
          nextOrder={list.items.length + 1}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}
    </>
  );
}

function ThemeEditor({ initial, nextOrder, onClose, onSaved }) {
  const editVerb = useEditVerb();
  const isNew = !initial.id;
  const [d, setD] = useState({ ...EMPTY, ...(isNew && { order: nextOrder }), ...initial });
  const [lang, setLang] = useState(DEFAULT_LANG);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const { run, busy } = useMutation(TAGS);
  const autoFill = useAutoFill();
  const { toast } = useUi();
  const set = (patch) => setD((x) => ({ ...x, ...patch }));

  const save = async () => {
    if (!anyLang(d.name)) return toast("Vui lòng nhập tên chủ đề ở ít nhất một ngôn ngữ", "error");
    const { value: v, failed } = await autoFill.fill(d, { lang });
    if (v !== d) setD(v);
    const slug = v.slug || slugify(slugSource(v.name));
    if (!slug) return toast("Vui lòng nhập đường dẫn trang", "error");
    if (slug !== v.slug) set({ slug });
    const body = toPayload({ ...v, slug });
    if (isNew) body.order = nextOrder;
    const ok = await run(
      () =>
        isNew
          ? api(PATH, { method: "POST", body })
          : api(`${PATH}/${d.id}`, { method: "PUT", body }),
      isNew ? "Đã thêm chủ đề" : "Đã lưu chủ đề",
    );
    if (!ok) return;
    if (failed)
      autoFill.offerRetry((t) =>
        api(`${PATH}/${ok.data?.id ?? d.id}`, {
          method: "PUT",
          body: { ...toPayload({ ...t, slug }), order: body.order },
        }),
      );
    onSaved();
  };

  return (
    <EditorModal
      size="xl"
      title={isNew ? "Thêm chủ đề" : `${editVerb}: ${locText(initial.name)}`}
      onClose={onClose}
      onSave={save}
      busy={busy || autoFill.busy}
    >
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
        <div className="space-y-4">
          <LangBar lang={lang} onLang={setLang} form={d} onForm={setD} />
          <Field label="Tên chủ đề" required>
            <LocInput
              value={d.name}
              lang={lang}
              onChange={(name) =>
                set({ name, ...(!slugTouched && { slug: slugify(slugSource(name)) }) })
              }
            />
          </Field>
          <Field label="Câu giới thiệu ngắn" hint="1 dòng, hiện dưới tên chủ đề trên thẻ">
            <LocInput value={d.tagline} lang={lang} onChange={(tagline) => set({ tagline })} />
          </Field>
          <Field label="Giới thiệu" hint="Đoạn mở đầu trên trang chủ đề">
            <LocInput
              value={d.intro}
              lang={lang}
              multiline
              rows={6}
              onChange={(intro) => set({ intro })}
            />
          </Field>
        </div>

        <div className="space-y-6">
          <FormSection title="Hình ảnh">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ảnh thẻ" hint="Ảnh ngang, tối thiểu 1200px">
                <ImageField value={d.image} onChange={(image) => set({ image })} folder="themes" />
              </Field>
              <Field label="Ảnh lớn đầu trang" hint="Để trống thì dùng ảnh thẻ">
                <ImageField
                  value={d.banner}
                  onChange={(banner) => set({ banner })}
                  folder="themes"
                  crop={{ ratio: 16 / 9, width: 1920 }}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Thiết lập">
            <Field label="Đường dẫn trang" required hint="Viết không dấu. Vd: family-tours">
              <Input
                value={d.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set({ slug: slugify(e.target.value) });
                }}
              />
            </Field>
            <Toggle
              checked={d.isActive}
              onChange={(isActive) => set({ isActive })}
              label="Hiện trên website"
            />
          </FormSection>
        </div>
      </div>
    </EditorModal>
  );
}
