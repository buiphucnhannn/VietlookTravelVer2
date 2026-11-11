"use client";

import { useMemo, useState } from "react";
import { MapPin, Plus, SearchX } from "lucide-react";
import { api } from "@/lib/api";
import { cn, foldSearch as fold, slugify } from "@/lib/utils";
import {
  CARD_GRID,
  EditorModal,
  FormSection,
  ItemActions,
  LangBar,
  Lines,
  MediaCard,
  useRemove,
  useEditVerb,
  useReorder,
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
  SearchBox,
  Select,
  DEFAULT_LANG,
  Toggle,
  anyLang,
  locText,
  usePaged,
  useUi,
} from "./ui";
import { usePendingImages } from "./pendingImages";
import { usePermission } from "./permissions";
import { slugSource, useAutoFill } from "./translate";

const PATH = "/admin/destinations";
// điểm đến thay đổi → trang điểm đến, menu, trang chủ, thẻ tour (tên điểm đến) đều đổi
const TAGS = ["destinations", "tours"];
const REMOVE_TAGS = [...TAGS, "settings"]; // xoá → trang chủ cũng bỏ điểm đến này
const PAGE_SIZE = 12; // lấp đầy hàng ở lưới 1 – 2 – 3 – 4 cột

export const REGIONS = [
  { value: "north-vietnam", label: "Miền Bắc" },
  { value: "central-vietnam", label: "Miền Trung" },
  { value: "south-vietnam", label: "Miền Nam" },
];
const regionLabel = (v) => REGIONS.find((r) => r.value === v)?.label ?? v;

const L = () => ({ en: "", zh: "", vi: "" });

const EMPTY = {
  slug: "",
  region: "north-vietnam",
  name: L(),
  intro: L(),
  highlights: [],
  image: "",
  hero: "",
  keywords: [],
  order: 0,
  isActive: true,
};

/** Bỏ trường hệ thống trước khi gửi (id, ngày tạo…) — validator backend chỉ nhận trường của form */
const toPayload = (d) => ({
  slug: d.slug,
  region: d.region,
  name: d.name,
  intro: d.intro,
  highlights: d.highlights,
  image: d.image,
  hero: d.hero,
  keywords: d.keywords,
  order: Number(d.order) || 0,
  isActive: d.isActive,
});

export default function DestinationsPage() {
  const { canEdit } = usePermission("destinations");
  const list = useAdminList(PATH, { limit: 200, sort: "order" });
  const [region, setRegion] = useState(REGIONS[0].value);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null); // null | EMPTY | doc
  const remove = useRemove(
    PATH,
    "điểm đến",
    REMOVE_TAGS,
    list.reload,
    "Điểm đến đang gắn với tour thì không xoá được — hãy ẩn thay vì xoá.",
  );
  const reorder = useReorder(list, PATH, TAGS);

  const term = fold(q.trim());
  const searching = Boolean(term);
  // đang tìm → kết quả ở cả 3 miền; không tìm → các điểm đến của miền đang chọn (kéo thả được)
  const scope = useMemo(
    () =>
      searching
        ? list.items.filter((d) =>
            [d.name?.vi, d.name?.en, d.name?.zh, d.slug, ...(d.keywords ?? [])].some((s) =>
              fold(s).includes(term),
            ),
          )
        : list.items.filter((d) => d.region === region),
    [list.items, region, searching, term],
  );
  const paged = usePaged(scope, PAGE_SIZE);
  const sort = usePagedSort({ all: scope, paged, onReorder: reorder });
  const patch = (doc) => list.setItems((xs) => xs.map((x) => (x.id === doc.id ? doc : x)));

  const renderCard = (d, drag, position) => (
    <MediaCard
      image={d.image}
      drag={drag}
      position={position}
      dimmed={!d.isActive}
      badges={
        <>
          {searching && <Badge tone="blue">{regionLabel(d.region)}</Badge>}
          {!d.name?.zh && <Badge tone="amber">Thiếu bản 中文</Badge>}
        </>
      }
      actions={
        <ItemActions
          path={PATH}
          item={d}
          tags={TAGS}
          onDone={patch}
          onEdit={() => setEditing(d)}
          onRemove={() => remove(d)}
        />
      }
    >
      <p className="truncate font-semibold text-slate-900">{locText(d.name)}</p>
      <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-slate-500">
        {locText(d.intro) || "Chưa có mô tả"}
      </p>
    </MediaCard>
  );

  return (
    <>
      <PageHeader
        title="Điểm đến"
        description={`Điểm đến theo 3 miền Bắc – Trung – Nam. Hiện trên menu, trang chủ, bộ lọc tour và trang điểm đến.${canEdit ? " Giữ và kéo thẻ để đổi thứ tự, hoặc bấm số thứ tự trên thẻ để chuyển nhanh tới vị trí bất kỳ." : ""}`}
        actions={
          canEdit && (
            <Button icon={Plus} onClick={() => setEditing({ ...EMPTY, region })}>
              Thêm điểm đến
            </Button>
          )
        }
      />

      <Card bodyClassName="p-0">
        <div className="flex flex-col items-center gap-3 border-b border-slate-100 p-4 sm:px-5">
          <div
            role="tablist"
            aria-label="Miền"
            className="flex w-full justify-center rounded-full bg-slate-100 p-1 sm:w-auto"
          >
            {REGIONS.map((r) => {
              const on = !searching && r.value === region;
              return (
                <button
                  key={r.value}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => {
                    setQ("");
                    setRegion(r.value);
                    paged.setPage(1);
                  }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1 rounded-full px-1.5 py-2 text-xs font-semibold whitespace-nowrap transition sm:flex-none sm:gap-1.5 sm:px-5 sm:text-[13px]",
                    on
                      ? "bg-white text-brand-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {r.label}
                  <span
                    className={cn(
                      "inline-grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] leading-none font-bold tabular-nums",
                      on ? "bg-brand-50 text-brand-700" : "bg-slate-200/70 text-slate-500",
                    )}
                  >
                    {list.items.filter((d) => d.region === r.value).length}
                  </span>
                </button>
              );
            })}
          </div>
          <SearchBox
            value={q}
            onChange={(v) => {
              setQ(v);
              paged.setPage(1);
            }}
            placeholder="Tìm điểm đến ở cả 3 miền…"
            className="w-full"
          />
        </div>

        <div className="p-4 sm:p-5">
          {list.error && (
            <Notice tone="error" className="mb-4">
              {list.error}
            </Notice>
          )}
          {list.loading && !list.items.length ? (
            <LoadingBlock />
          ) : !scope.length ? (
            searching ? (
              <EmptyState
                icon={SearchX}
                title="Không tìm thấy điểm đến"
                text="Thử tìm bằng tên khác."
              />
            ) : (
              <EmptyState
                icon={MapPin}
                title={`Chưa có điểm đến ở ${regionLabel(region)}`}
                text="Thêm điểm đến để gắn vào tour."
                action={
                  canEdit && (
                    <Button icon={Plus} onClick={() => setEditing({ ...EMPTY, region })}>
                      Thêm điểm đến
                    </Button>
                  )
                }
              />
            )
          ) : searching ? (
            <div className={CARD_GRID}>
              {paged.items.map((d) => (
                <div key={d.id}>{renderCard(d)}</div>
              ))}
            </div>
          ) : (
            <Sortable
              items={paged.items}
              getId={(d) => d.id}
              layout="grid"
              className={CARD_GRID}
              onReorder={sort.onPageReorder}
              highlight={sort.flash}
              disabled={!canEdit}
            >
              {(d, i, drag) => renderCard(d, drag, sort.badge(d, i))}
            </Sortable>
          )}
          <Pagination bare unit="điểm đến" meta={paged.meta} onPage={paged.setPage} />
        </div>
      </Card>

      {editing && (
        <DestinationEditor
          initial={editing}
          all={list.items}
          onClose={() => setEditing(null)}
          onSaved={(doc) => {
            setEditing(null);
            if (doc?.region) {
              setQ("");
              setRegion(doc.region);
            }
            sort.reveal(doc?.id); // mục vừa lưu: sang đúng trang + nháy viền
            list.reload();
          }}
        />
      )}
    </>
  );
}

function DestinationEditor({ initial, all, onClose, onSaved }) {
  const editVerb = useEditVerb();
  const isNew = !initial.id;
  const [d, setD] = useState({ ...EMPTY, ...initial });
  const [lang, setLang] = useState(DEFAULT_LANG);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [kw, setKw] = useState((initial.keywords ?? []).join(", "));
  const { run, busy } = useMutation(TAGS);
  const autoFill = useAutoFill();
  const images = usePendingImages(d);
  const { toast } = useUi();
  const set = (patch) => setD((x) => ({ ...x, ...patch }));

  const save = async () => {
    if (!anyLang(d.name))
      return toast("Vui lòng nhập tên điểm đến ở ít nhất một ngôn ngữ", "error");
    // ảnh vừa chọn chỉ được lưu vào kho ảnh lúc này
    const withImages = await images.prepare(d);
    if (!withImages) return;
    if (withImages !== d) setD(withImages);
    const { value: v, failed } = await autoFill.fill(withImages, { lang });
    if (v !== withImages) setD(v);
    const slug = v.slug || slugify(slugSource(v.name));
    if (!slug) return toast("Vui lòng nhập đường dẫn trang", "error");
    if (slug !== v.slug) set({ slug });
    const body = toPayload({ ...v, slug });
    // mới thêm / chuyển sang miền khác → xếp cuối miền đó
    if (isNew || d.region !== initial.region)
      body.order = all.filter((x) => x.region === d.region && x.id !== d.id).length + 1;
    const ok = await run(
      () =>
        isNew
          ? api(PATH, { method: "POST", body })
          : api(`${PATH}/${d.id}`, { method: "PUT", body }),
      isNew ? "Đã thêm điểm đến" : "Đã lưu điểm đến",
      // đổi đường dẫn → máy chủ sửa luôn danh sách trên trang chủ → xoá cache trang chủ
      { extraTags: !isNew && slug !== initial.slug ? ["settings"] : [] },
    );
    if (!ok) return;
    if (failed)
      autoFill.offerRetry((t) =>
        api(`${PATH}/${ok.data?.id ?? d.id}`, {
          method: "PUT",
          body: { ...toPayload({ ...t, slug }), order: body.order },
        }),
      );
    onSaved({ ...body, id: ok.data?.id ?? d.id });
  };

  return (
    <EditorModal
      size="xl"
      title={isNew ? "Thêm điểm đến" : `${editVerb}: ${locText(initial.name)}`}
      value={{ d, kw }}
      onClose={onClose}
      onSave={save}
      busy={busy || autoFill.busy || images.busy}
      saveLabel={images.label}
    >
      {/* Thứ tự theo trang điểm đến trên website: đầu trang (ảnh lớn, tên, mô tả) → thẻ điểm đến
          (ảnh thẻ, điểm nổi bật — ở trang chủ, menu, danh sách) → cài đặt hiển thị ở cuối */}
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
        <div className="space-y-4">
          <LangBar lang={lang} onLang={setLang} form={d} onForm={setD} />
          <FormSection title="Đầu trang điểm đến">
            <Field
              label="Ảnh lớn đầu trang"
              hint="Phủ ngang đầu trang điểm đến. Để trống thì dùng ảnh thẻ."
            >
              <ImageField
                value={d.hero}
                onChange={(hero) => set({ hero })}
                folder="destinations"
                crop={{ ratio: 12 / 5, width: 2400 }}
              />
            </Field>
            <Field
              label="Tên điểm đến"
              required
              hint="Tiêu đề đầu trang hiện “Tour + tên điểm đến”."
            >
              <LocInput
                value={d.name}
                lang={lang}
                onChange={(name) =>
                  set({ name, ...(!slugTouched && { slug: slugify(slugSource(name)) }) })
                }
              />
            </Field>
            <Field label="Mô tả ngắn (2–3 câu)" hint="Hiện dưới tiêu đề đầu trang.">
              <LocInput
                value={d.intro}
                lang={lang}
                multiline
                rows={4}
                onChange={(intro) => set({ intro })}
              />
            </Field>
          </FormSection>
        </div>

        <div className="space-y-6">
          <FormSection title="Thẻ điểm đến">
            <Field
              label="Ảnh thẻ"
              hint="Hiện ở thẻ điểm đến (trang chủ, menu, danh sách). Ảnh ngang, chủ thể ở giữa."
            >
              <div className="max-w-xs">
                <ImageField
                  value={d.image}
                  onChange={(image) => set({ image })}
                  folder="destinations"
                />
              </div>
            </Field>
            <Field
              label="Điểm nổi bật"
              hint="Hiện dạng nhãn trên thẻ điểm đến ở trang chủ (VD: Phố cổ, Hồ Hoàn Kiếm). Kéo để đổi thứ tự."
            >
              <Lines
                value={d.highlights}
                onChange={(highlights) => set({ highlights })}
                text={(h) => h?.[lang]}
                withText={(h, v) => ({ ...L(), ...h, [lang]: v })}
                blank={L()}
                addLabel="Thêm điểm nổi bật"
              />
            </Field>
          </FormSection>

          <FormSection title="Cài đặt hiển thị">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Miền" required>
                <Select value={d.region} onChange={(e) => set({ region: e.target.value })}>
                  {REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Đường dẫn trang" required hint="Viết không dấu. Vd: ha-long-bay">
                <Input
                  value={d.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set({ slug: slugify(e.target.value) });
                  }}
                />
              </Field>
            </div>
            <Field label="Tên gọi khác" hint="Các cách viết khác, cách nhau bằng dấu phẩy.">
              <Input
                value={kw}
                onChange={(e) => {
                  setKw(e.target.value);
                  set({
                    keywords: e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  });
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
