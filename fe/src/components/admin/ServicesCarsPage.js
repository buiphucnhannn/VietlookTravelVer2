"use client";

import { useState } from "react";
import { Briefcase, Car, MapPinned, Plane, Plus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { slugify } from "@/lib/utils";
import {
  CARD_GRID,
  EditorModal,
  FormSection,
  ItemActions,
  LangBar,
  Lines,
  MediaCard,
  useRemove,
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
  GalleryField,
  ImageField,
  Input,
  LANGS,
  LoadingBlock,
  LocInput,
  Notice,
  PageHeader,
  Pagination,
  Toggle,
  locText,
  usePaged,
  useUi,
} from "./ui";

const CARS = "/admin/cars";
const AREAS = "/admin/car-areas";
const TAGS = ["services"];
const PAGE_SIZE = 8; // 2 hàng × 4 cột
const L = () => ({ en: "", zh: "", vi: "" });

const EMPTY_CAR = {
  key: "",
  seats: 4,
  pax: 3,
  luggage: 2,
  name: L(),
  tagline: L(),
  description: L(),
  images: [],
  models: [],
  ideal: { en: [], zh: [], vi: [] },
  priceKey: "",
  accent: "#1780c1",
  vip: false,
  order: 0,
  isActive: true,
};

const EMPTY_AREA = { key: "", name: L(), airport: "", image: "", order: 0, isActive: true };

const carPayload = (d) => ({
  key: d.key,
  seats: Number(d.seats) || 1,
  pax: Number(d.pax) || 1,
  luggage: Number(d.luggage) || 0,
  name: d.name,
  tagline: d.tagline,
  description: d.description,
  images: d.images,
  models: d.models.map((m) => m.trim()).filter(Boolean),
  ideal: Object.fromEntries(
    LANGS.map((l) => [l.key, (d.ideal?.[l.key] ?? []).map((x) => x.trim()).filter(Boolean)]),
  ),
  priceKey: d.priceKey,
  accent: /^#[0-9a-f]{6}$/i.test(d.accent) ? d.accent : "#1780c1",
  vip: d.vip,
  order: Number(d.order) || 0,
  isActive: d.isActive,
});

const areaPayload = (d) => ({
  key: d.key,
  name: d.name,
  airport: d.airport,
  image: d.image,
  order: Number(d.order) || 0,
  isActive: d.isActive,
});

export default function ServicesCarsPage() {
  const cars = useAdminList(CARS, { limit: 100, sort: "order" });
  const areas = useAdminList(AREAS, { limit: 100, sort: "order" });
  const [car, setCar] = useState(null);
  const [area, setArea] = useState(null);

  return (
    <>
      <PageHeader
        title="Xe & khu vực"
        description="Các loại xe cho thuê kèm tài xế và khu vực phục vụ, hiện trên trang thuê xe của website. Giữ và kéo thẻ để đổi thứ tự, hoặc bấm số thứ tự trên thẻ để chuyển nhanh tới vị trí bất kỳ."
      />

      <div className="space-y-6">
        <CardSection
          title="Loại xe"
          description="Thông tin, ảnh và đối tượng phù hợp của từng loại xe. Bảng giá theo tuyến do đơn vị phát triển cập nhật."
          addLabel="Thêm loại xe"
          onAdd={() => setCar(EMPTY_CAR)}
          list={cars}
          path={CARS}
          label="loại xe"
          unit="loại xe"
          emptyIcon={Car}
          emptyTitle="Chưa có loại xe"
          onEdit={setCar}
          image={(c) => c.images?.[0]}
          badges={(c) => c.vip && <Badge tone="violet">VIP</Badge>}
          render={(c) => (
            <>
              <p className="flex items-center gap-2 font-semibold text-slate-900">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.accent }} />
                <span className="truncate">{locText(c.name)}</span>
              </p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Car className="size-3.5" /> {c.seats} chỗ
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" /> {c.pax} khách
                </span>
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="size-3.5" /> {c.luggage} vali
                </span>
              </p>
            </>
          )}
        />

        <CardSection
          title="Khu vực phục vụ"
          description="Thành phố / sân bay có dịch vụ xe đưa đón."
          addLabel="Thêm khu vực"
          onAdd={() => setArea(EMPTY_AREA)}
          list={areas}
          path={AREAS}
          label="khu vực"
          unit="khu vực"
          emptyIcon={MapPinned}
          emptyTitle="Chưa có khu vực phục vụ"
          onEdit={setArea}
          image={(a) => a.image}
          render={(a) => (
            <>
              <p className="truncate font-semibold text-slate-900">{locText(a.name)}</p>
              <p className="mt-1.5 flex min-h-4 items-center gap-1 text-xs text-slate-500">
                {a.airport && (
                  <>
                    <Plane className="size-3.5 shrink-0" />
                    <span className="truncate">{a.airport}</span>
                  </>
                )}
              </p>
            </>
          )}
        />
      </div>

      {car && (
        <CarEditor
          initial={car}
          nextOrder={cars.items.length + 1}
          onClose={() => setCar(null)}
          onSaved={() => {
            setCar(null);
            cars.reload();
          }}
        />
      )}
      {area && (
        <AreaEditor
          initial={area}
          nextOrder={areas.items.length + 1}
          onClose={() => setArea(null)}
          onSaved={() => {
            setArea(null);
            areas.reload();
          }}
        />
      )}
    </>
  );
}

/** Khung dùng chung cho 2 phần: lưới thẻ kéo – thả, phân trang, ẩn/hiện, sửa, xoá */
function CardSection({
  title,
  description,
  addLabel,
  onAdd,
  list,
  path,
  label,
  unit,
  emptyIcon,
  emptyTitle,
  onEdit,
  image,
  badges,
  render,
}) {
  const remove = useRemove(path, label, TAGS, list.reload);
  const reorder = useReorder(list, path, TAGS);
  const paged = usePaged(list.items, PAGE_SIZE);
  const sort = usePagedSort({ all: list.items, paged, onReorder: reorder });
  const patch = (doc) => list.setItems((xs) => xs.map((y) => (y.id === doc.id ? doc : y)));

  return (
    <Card
      title={title}
      description={description}
      actions={
        <Button size="sm" icon={Plus} onClick={onAdd}>
          {addLabel}
        </Button>
      }
      bodyClassName="p-4 sm:p-5"
    >
      {list.error ? (
        <Notice tone="error">{list.error}</Notice>
      ) : list.loading && !list.items.length ? (
        <LoadingBlock />
      ) : !list.items.length ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} />
      ) : (
        <Sortable
          items={paged.items}
          getId={(x) => x.id}
          layout="grid"
          className={CARD_GRID}
          onReorder={sort.onPageReorder}
          highlight={sort.flash}
        >
          {(x, i, drag) => (
            <MediaCard
              image={image(x)}
              drag={drag}
              position={sort.badge(x, i)}
              dimmed={!x.isActive}
              badges={badges?.(x)}
              actions={
                <ItemActions
                  path={path}
                  item={x}
                  tags={TAGS}
                  onDone={patch}
                  onEdit={() => onEdit(x)}
                  onRemove={() => remove(x)}
                />
              }
            >
              {render(x)}
            </MediaCard>
          )}
        </Sortable>
      )}
      <Pagination bare unit={unit} meta={paged.meta} onPage={paged.setPage} />
    </Card>
  );
}

function CarEditor({ initial, nextOrder, onClose, onSaved }) {
  const isNew = !initial.id;
  const [d, setD] = useState({
    ...EMPTY_CAR,
    ...initial,
    ideal: { en: [], zh: [], vi: [], ...initial.ideal },
  });
  const [lang, setLang] = useState("en");
  const [keyTouched, setKeyTouched] = useState(!isNew);
  const { run, busy } = useMutation(TAGS);
  const { toast } = useUi();
  const set = (patch) => setD((x) => ({ ...x, ...patch }));
  const validColor = /^#[0-9a-f]{6}$/i.test(d.accent);

  const save = async () => {
    if (!d.name.en?.trim()) {
      setLang("en");
      return toast("Vui lòng nhập tên loại xe bằng tiếng Anh", "error");
    }
    if (!d.key) return toast("Vui lòng nhập mã loại xe", "error");
    if (!validColor) return toast("Màu nhấn chưa đúng, vui lòng chọn lại màu", "error");
    const body = carPayload(d);
    if (isNew) body.order = nextOrder;
    const ok = await run(
      () =>
        isNew
          ? api(CARS, { method: "POST", body })
          : api(`${CARS}/${d.id}`, { method: "PUT", body }),
      isNew ? "Đã thêm loại xe" : "Đã lưu loại xe",
    );
    if (ok) onSaved();
  };

  return (
    <EditorModal
      size="xl"
      title={isNew ? "Thêm loại xe" : `Sửa: ${locText(initial.name)}`}
      onClose={onClose}
      onSave={save}
      busy={busy}
    >
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
        <div className="space-y-4">
          <LangBar lang={lang} onLang={setLang} form={d} onForm={setD} />
          <Field label="Tên loại xe" required={lang === "en"}>
            <LocInput
              value={d.name}
              lang={lang}
              onChange={(name) =>
                set({ name, ...(!keyTouched && lang === "en" && { key: slugify(name.en) }) })
              }
            />
          </Field>
          <Field label="Câu giới thiệu ngắn">
            <LocInput value={d.tagline} lang={lang} onChange={(tagline) => set({ tagline })} />
          </Field>
          <Field label="Mô tả">
            <LocInput
              value={d.description}
              lang={lang}
              multiline
              rows={3}
              onChange={(description) => set({ description })}
            />
          </Field>
          <Field
            label={`Phù hợp cho (${LANGS.find((l) => l.key === lang)?.label})`}
            hint="Mỗi dòng 1 ý, vd: Gia đình 3–4 người, Đón sân bay. Kéo để đổi thứ tự."
          >
            <Lines
              value={d.ideal[lang] ?? []}
              onChange={(vals) => set({ ideal: { ...d.ideal, [lang]: vals } })}
              addLabel="Thêm dòng"
            />
          </Field>
        </div>

        <div className="space-y-6">
          <FormSection title="Sức chứa">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Số chỗ" required>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={d.seats}
                  onChange={(e) => set({ seats: e.target.value })}
                />
              </Field>
              <Field label="Số khách">
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={d.pax}
                  onChange={(e) => set({ pax: e.target.value })}
                />
              </Field>
              <Field label="Số vali">
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={d.luggage}
                  onChange={(e) => set({ luggage: e.target.value })}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Dòng xe tiêu biểu">
            <Lines
              value={d.models}
              onChange={(models) => set({ models })}
              max={20}
              placeholder="VD: Toyota Camry"
              addLabel="Thêm dòng xe"
            />
          </FormSection>

          <FormSection title="Ảnh xe (ảnh đầu tiên là ảnh đại diện)">
            <GalleryField
              value={d.images}
              onChange={(images) => set({ images })}
              folder="cars"
              max={12}
              crop={{ ratio: 16 / 10, width: 1600 }}
            />
          </FormSection>
        </div>

        <FormSection title="Thiết lập" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Mã (không dấu)" required hint="Tự tạo từ tên tiếng Anh. Vd: sedan-4">
              <Input
                value={d.key}
                onChange={(e) => {
                  setKeyTouched(true);
                  set({ key: slugify(e.target.value) });
                }}
              />
            </Field>
            <Field label="Mã bảng giá" hint="Không rõ thì giữ nguyên.">
              <Input
                value={d.priceKey}
                onChange={(e) => set({ priceKey: e.target.value.trim() })}
              />
            </Field>
            <Field label="Màu nhấn" hint="Màu điểm nhấn của thẻ xe trên website">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={validColor ? d.accent : "#1780c1"}
                  onChange={(e) => set({ accent: e.target.value })}
                  className="h-11 w-14 shrink-0 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                  aria-label="Chọn màu"
                />
                <Input
                  value={d.accent}
                  onChange={(e) => set({ accent: e.target.value.trim() })}
                  aria-invalid={!validColor}
                  className="font-mono"
                  maxLength={7}
                />
              </div>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Toggle
              checked={d.isActive}
              onChange={(isActive) => set({ isActive })}
              label="Hiện trên website"
            />
            <Toggle
              checked={d.vip}
              onChange={(vip) => set({ vip })}
              label="Xe VIP"
              hint="Gắn nhãn VIP trên website"
            />
          </div>
        </FormSection>
      </div>
    </EditorModal>
  );
}

function AreaEditor({ initial, nextOrder, onClose, onSaved }) {
  const isNew = !initial.id;
  const [d, setD] = useState({ ...EMPTY_AREA, ...initial });
  const [lang, setLang] = useState("en");
  const [keyTouched, setKeyTouched] = useState(!isNew);
  const { run, busy } = useMutation(TAGS);
  const { toast } = useUi();
  const set = (patch) => setD((x) => ({ ...x, ...patch }));

  const save = async () => {
    if (!d.name.en?.trim()) {
      setLang("en");
      return toast("Vui lòng nhập tên khu vực bằng tiếng Anh", "error");
    }
    if (!d.key) return toast("Vui lòng nhập mã khu vực", "error");
    const body = areaPayload(d);
    if (isNew) body.order = nextOrder;
    const ok = await run(
      () =>
        isNew
          ? api(AREAS, { method: "POST", body })
          : api(`${AREAS}/${d.id}`, { method: "PUT", body }),
      isNew ? "Đã thêm khu vực" : "Đã lưu khu vực",
    );
    if (ok) onSaved();
  };

  return (
    <EditorModal
      title={isNew ? "Thêm khu vực phục vụ" : `Sửa: ${locText(initial.name)}`}
      onClose={onClose}
      onSave={save}
      busy={busy}
    >
      <div className="space-y-5">
        <LangBar title="Tên theo ngôn ngữ" lang={lang} onLang={setLang} form={d} onForm={setD} />
        <Field label="Tên khu vực" required={lang === "en"}>
          <LocInput
            value={d.name}
            lang={lang}
            onChange={(name) =>
              set({ name, ...(!keyTouched && lang === "en" && { key: slugify(name.en) }) })
            }
          />
        </Field>

        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <Field label="Ảnh" hint="Ảnh ngang của thành phố">
            <ImageField value={d.image} onChange={(image) => set({ image })} folder="cars" />
          </Field>
          <div className="space-y-4">
            <Field label="Sân bay" hint="VD: Tân Sơn Nhất (SGN)">
              <Input value={d.airport} onChange={(e) => set({ airport: e.target.value })} />
            </Field>
            <Field label="Mã (không dấu)" required hint="Tự tạo từ tên tiếng Anh. Vd: ho-chi-minh">
              <Input
                value={d.key}
                onChange={(e) => {
                  setKeyTouched(true);
                  set({ key: slugify(e.target.value) });
                }}
              />
            </Field>
            <Toggle
              checked={d.isActive}
              onChange={(isActive) => set({ isActive })}
              label="Hiện trên website"
            />
          </div>
        </div>
      </div>
    </EditorModal>
  );
}
