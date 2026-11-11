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
  GalleryField,
  ImageField,
  Input,
  LANGS,
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
import { usePendingImages } from "./pendingImages";
import { usePermission } from "./permissions";
import { slugSource, useAutoFill } from "./translate";

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
  const { canEdit } = usePermission("cars");
  const cars = useAdminList(CARS, { limit: 100, sort: "order" });
  const areas = useAdminList(AREAS, { limit: 100, sort: "order" });
  const [car, setCar] = useState(null);
  const [area, setArea] = useState(null);
  // mục vừa lưu → thẻ đó được đưa vào tầm nhìn (sang đúng trang) và nháy viền
  const [savedCar, setSavedCar] = useState(null);
  const [savedArea, setSavedArea] = useState(null);

  return (
    <>
      <PageHeader
        title="Xe & khu vực"
        description={`Các loại xe cho thuê kèm tài xế và khu vực phục vụ, hiện trên trang thuê xe của website.${canEdit ? " Giữ và kéo thẻ để đổi thứ tự, hoặc bấm số thứ tự trên thẻ để chuyển nhanh tới vị trí bất kỳ." : ""}`}
      />

      <div className="space-y-6">
        <CardSection
          title="Loại xe"
          description="Thông tin, ảnh và đối tượng phù hợp của từng loại xe. Bảng giá theo tuyến do đơn vị phát triển cập nhật."
          addLabel="Thêm loại xe"
          onAdd={() => setCar(EMPTY_CAR)}
          list={cars}
          reveal={savedCar}
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
              <p className="truncate font-semibold text-slate-900">{locText(c.name)}</p>
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
          reveal={savedArea}
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
          onSaved={(id) => {
            setCar(null);
            setSavedCar({ id });
            cars.reload();
          }}
        />
      )}
      {area && (
        <AreaEditor
          initial={area}
          nextOrder={areas.items.length + 1}
          onClose={() => setArea(null)}
          onSaved={(id) => {
            setArea(null);
            setSavedArea({ id });
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
  reveal,
}) {
  const { canEdit } = usePermission("cars");
  const remove = useRemove(path, label, TAGS, list.reload);
  const reorder = useReorder(list, path, TAGS);
  const paged = usePaged(list.items, PAGE_SIZE);
  const sort = usePagedSort({ all: list.items, paged, onReorder: reorder });
  const [revealed, setRevealed] = useState(null);
  if (reveal && reveal !== revealed) {
    setRevealed(reveal);
    sort.reveal(reveal.id);
  }
  const patch = (doc) => list.setItems((xs) => xs.map((y) => (y.id === doc.id ? doc : y)));

  return (
    <Card
      title={title}
      description={description}
      actions={
        canEdit && (
          <Button size="sm" icon={Plus} onClick={onAdd}>
            {addLabel}
          </Button>
        )
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
          disabled={!canEdit}
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
  const editVerb = useEditVerb();
  const isNew = !initial.id;
  const [d, setD] = useState({
    ...EMPTY_CAR,
    ...initial,
    ideal: { en: [], zh: [], vi: [], ...initial.ideal },
  });
  const [lang, setLang] = useState(DEFAULT_LANG);
  const [keyTouched, setKeyTouched] = useState(!isNew);
  const { run, busy } = useMutation(TAGS);
  const autoFill = useAutoFill();
  const images = usePendingImages(d);
  const { toast } = useUi();
  const set = (patch) => setD((x) => ({ ...x, ...patch }));
  // Số khách tối đa không vượt số chỗ (VD xe 4 chỗ chở tối đa 4 khách)
  const paxError =
    Number(d.pax) > Number(d.seats) ? "Số khách không được nhiều hơn số chỗ của xe" : null;

  const save = async () => {
    if (!anyLang(d.name)) return toast("Vui lòng nhập tên loại xe ở ít nhất một ngôn ngữ", "error");
    if (paxError) return toast(`${paxError}.`, "error");
    const { value: v, failed } = await autoFill.fill(d, { lang });
    if (v !== d) setD(v);
    const key = v.key || slugify(slugSource(v.name));
    if (!key) return toast("Vui lòng nhập mã loại xe", "error");
    if (key !== v.key) set({ key });
    // ảnh vừa chọn chỉ được lưu vào kho ảnh lúc này
    const body = await images.prepare(carPayload({ ...v, key }));
    if (!body) return;
    if (isNew) body.order = nextOrder;
    const ok = await run(
      () =>
        isNew
          ? api(CARS, { method: "POST", body })
          : api(`${CARS}/${d.id}`, { method: "PUT", body }),
      isNew ? "Đã thêm loại xe" : "Đã lưu loại xe",
    );
    if (!ok) return;
    if (failed)
      autoFill.offerRetry((t) =>
        api(`${CARS}/${ok.data?.id ?? d.id}`, {
          method: "PUT",
          body: { ...carPayload({ ...t, key }), order: body.order },
        }),
      );
    onSaved(ok.data?.id ?? d.id);
  };

  return (
    <EditorModal
      size="xl"
      title={isNew ? "Thêm loại xe" : `${editVerb}: ${locText(initial.name)}`}
      value={d}
      onClose={onClose}
      onSave={save}
      busy={busy || autoFill.busy || images.busy}
      saveLabel={images.label}
    >
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
        <div className="space-y-4">
          <LangBar lang={lang} onLang={setLang} form={d} onForm={setD} />
          <Field label="Tên loại xe" required>
            <LocInput
              value={d.name}
              lang={lang}
              onChange={(name) =>
                set({ name, ...(!keyTouched && { key: slugify(slugSource(name)) }) })
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
              <Field label="Số khách" error={paxError}>
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
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <Field label="Mã loại xe (không dấu)" required hint="Tự tạo từ tên, vd: sedan-4.">
              <Input
                value={d.key}
                onChange={(e) => {
                  setKeyTouched(true);
                  set({ key: slugify(e.target.value) });
                }}
              />
            </Field>
            <Field
              label="Cột giá theo tuyến"
              hint="Nối loại xe với cột giá trong bảng giá tuyến của website (vd. giá đón sân bay). Không rõ thì giữ nguyên."
            >
              <Input
                value={d.priceKey}
                onChange={(e) => set({ priceKey: e.target.value.trim() })}
              />
            </Field>
            <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
              <Toggle
                checked={d.isActive}
                onChange={(isActive) => set({ isActive })}
                label="Hiện trên website"
                hint="Tắt để tạm ẩn loại xe này khỏi trang Thuê xe."
              />
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
              <Toggle
                checked={d.vip}
                onChange={(vip) => set({ vip })}
                label="Xe VIP"
                hint="Gắn nhãn VIP trên thẻ xe ở website."
              />
            </div>
          </div>
        </FormSection>
      </div>
    </EditorModal>
  );
}

function AreaEditor({ initial, nextOrder, onClose, onSaved }) {
  const editVerb = useEditVerb();
  const isNew = !initial.id;
  const [d, setD] = useState({ ...EMPTY_AREA, ...initial });
  const [lang, setLang] = useState(DEFAULT_LANG);
  const [keyTouched, setKeyTouched] = useState(!isNew);
  const { run, busy } = useMutation(TAGS);
  const autoFill = useAutoFill();
  const images = usePendingImages(d);
  const { toast } = useUi();
  const set = (patch) => setD((x) => ({ ...x, ...patch }));

  const save = async () => {
    if (!anyLang(d.name)) return toast("Vui lòng nhập tên khu vực ở ít nhất một ngôn ngữ", "error");
    const { value: v, failed } = await autoFill.fill(d, { lang });
    if (v !== d) setD(v);
    const key = v.key || slugify(slugSource(v.name));
    if (!key) return toast("Vui lòng nhập mã khu vực", "error");
    if (key !== v.key) set({ key });
    // ảnh vừa chọn chỉ được lưu vào kho ảnh lúc này
    const body = await images.prepare(areaPayload({ ...v, key }));
    if (!body) return;
    if (isNew) body.order = nextOrder;
    const ok = await run(
      () =>
        isNew
          ? api(AREAS, { method: "POST", body })
          : api(`${AREAS}/${d.id}`, { method: "PUT", body }),
      isNew ? "Đã thêm khu vực" : "Đã lưu khu vực",
    );
    if (!ok) return;
    if (failed)
      autoFill.offerRetry((t) =>
        api(`${AREAS}/${ok.data?.id ?? d.id}`, {
          method: "PUT",
          body: { ...areaPayload({ ...t, key }), order: body.order },
        }),
      );
    onSaved(ok.data?.id ?? d.id);
  };

  return (
    <EditorModal
      title={isNew ? "Thêm khu vực phục vụ" : `${editVerb}: ${locText(initial.name)}`}
      value={d}
      onClose={onClose}
      onSave={save}
      busy={busy || autoFill.busy || images.busy}
      saveLabel={images.label}
    >
      <div className="space-y-5">
        <LangBar title="Tên theo ngôn ngữ" lang={lang} onLang={setLang} form={d} onForm={setD} />
        <Field label="Tên khu vực" required>
          <LocInput
            value={d.name}
            lang={lang}
            onChange={(name) =>
              set({ name, ...(!keyTouched && { key: slugify(slugSource(name)) }) })
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
            <Field label="Mã (không dấu)" required hint="Tự tạo từ tên. Vd: ho-chi-minh">
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
