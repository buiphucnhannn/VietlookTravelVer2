"use client";

import { useState } from "react";
import {
  CalendarDays,
  Clock,
  GripVertical,
  PlaneLanding,
  PlaneTakeoff,
  Plus,
  Sparkles,
  Stamp,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, slugify } from "@/lib/utils";
import {
  CARD_GRID,
  EditorModal,
  FormSection,
  ItemActions,
  LangBar,
  useRemove,
  useReorder,
  useEditVerb,
} from "./catalogShared";
import { useAdminList, useMutation } from "./hooks";
import { DragHandle, PositionBadge, Sortable, usePagedSort } from "./Sortable";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  LocInput,
  Notice,
  PageHeader,
  Pagination,
  Select,
  DEFAULT_LANG,
  Toggle,
  anyLang,
  fmtUSD,
  locText,
  usePaged,
  useUi,
} from "./ui";
import { usePermission } from "./permissions";
import { slugSource, useAutoFill } from "./translate";

const VISA = "/admin/visa-types";
const FT = "/admin/fast-track";
const TAGS = ["services"];
const VISA_PAGE = 8; // 4 hàng × 2 cột
const FT_PAGE = 10;
const L = () => ({ en: "", zh: "", vi: "" });

export const AIRPORTS = [
  { code: "SGN", label: "Tân Sơn Nhất" },
  { code: "HAN", label: "Nội Bài" },
  { code: "DAD", label: "Đà Nẵng" },
  { code: "CXR", label: "Cam Ranh" },
  { code: "PQC", label: "Phú Quốc" },
];

const GROUPS = [
  { value: "arrival", label: "Chiều đến", Icon: PlaneLanding },
  { value: "departure", label: "Chiều đi", Icon: PlaneTakeoff },
  { value: "addon", label: "Dịch vụ cộng thêm", Icon: Sparkles },
];

const EMPTY_VISA = {
  key: "",
  name: L(),
  stay: L(),
  processing: L(),
  fee: L(),
  note: L(),
  order: 0,
  isActive: true,
};

const EMPTY_FT = {
  key: "",
  group: "arrival",
  name: L(),
  desc: L(),
  prices: Object.fromEntries(AIRPORTS.map((a) => [a.code, null])),
  popular: false,
  vip: false,
  order: 0,
  isActive: true,
};

const visaPayload = (d) => ({
  key: d.key,
  name: d.name,
  stay: d.stay,
  processing: d.processing,
  fee: d.fee,
  note: d.note,
  order: Number(d.order) || 0,
  isActive: d.isActive,
});

const ftPayload = (d) => ({
  key: d.key,
  group: d.group,
  name: d.name,
  desc: d.desc,
  prices: Object.fromEntries(
    AIRPORTS.map(({ code }) => {
      const v = d.prices?.[code];
      return [code, v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v)];
    }),
  ),
  popular: d.popular,
  vip: d.vip,
  order: Number(d.order) || 0,
  isActive: d.isActive,
});

const patchItem = (list) => (doc) =>
  list.setItems((xs) => xs.map((x) => (x.id === doc.id ? doc : x)));

export default function ServicesVisaPage() {
  const { canEdit } = usePermission("visa");
  const visas = useAdminList(VISA, { limit: 100, sort: "order" });
  const fts = useAdminList(FT, { limit: 200, sort: "order" });
  const [visa, setVisa] = useState(null);
  const [ft, setFt] = useState(null);
  const removeVisa = useRemove(VISA, "loại visa", TAGS, visas.reload);
  const reorderVisa = useReorder(visas, VISA, TAGS);
  const visaPaged = usePaged(visas.items, VISA_PAGE);
  const visaSort = usePagedSort({ all: visas.items, paged: visaPaged, onReorder: reorderVisa });

  return (
    <>
      <PageHeader
        title="Visa & fast-track"
        description={`Các loại visa Việt Nam và gói đón tiễn nhanh (fast-track) tại sân bay, hiện trên trang dịch vụ của website.${canEdit ? " Giữ và kéo để đổi thứ tự, hoặc bấm số thứ tự để chuyển nhanh tới vị trí bất kỳ." : ""}`}
      />

      <div className="space-y-6">
        <Card
          title="Loại visa"
          description="Thời gian lưu trú, thời gian xử lý, phí và ghi chú của từng loại visa."
          actions={
            canEdit && (
              <Button size="sm" icon={Plus} onClick={() => setVisa(EMPTY_VISA)}>
                Thêm loại visa
              </Button>
            )
          }
          bodyClassName="p-4 sm:p-5"
        >
          {visas.error ? (
            <Notice tone="error">{visas.error}</Notice>
          ) : visas.loading && !visas.items.length ? (
            <LoadingBlock />
          ) : !visas.items.length ? (
            <EmptyState icon={Stamp} title="Chưa có loại visa" />
          ) : (
            <Sortable
              items={visaPaged.items}
              getId={(v) => v.id}
              layout="grid"
              className="grid gap-5 lg:grid-cols-2"
              onReorder={visaSort.onPageReorder}
              highlight={visaSort.flash}
              disabled={!canEdit}
            >
              {(v, i, drag) => (
                <article
                  className={cn(
                    "@container flex h-full flex-col rounded-2xl bg-white ring-1 ring-slate-200 transition-shadow hover:shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)]",
                    drag.dragging && "ring-2 ring-brand-400",
                  )}
                >
                  <div {...drag.handle} className="flex-1 px-5 pt-5 pb-4 outline-none">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                        <Stamp className="size-5" />
                      </span>
                      <p className="min-w-0 flex-1 pt-2 text-[15px] leading-snug font-semibold text-slate-900">
                        {locText(v.name)}
                      </p>
                      {canEdit && (
                        <span className="flex shrink-0 items-center gap-0.5 pt-1">
                          <GripVertical className="size-4 text-slate-400" aria-hidden="true" />
                          <PositionBadge {...visaSort.badge(v, i)} />
                        </span>
                      )}
                    </div>
                    <dl className="mt-4 grid divide-y divide-slate-100 rounded-xl bg-slate-50/80 px-3.5 ring-1 ring-slate-100 @[30rem]:grid-cols-3 @[30rem]:divide-x @[30rem]:divide-y-0 @[30rem]:px-0">
                      {[
                        { Icon: CalendarDays, label: "Lưu trú", text: locText(v.stay) },
                        { Icon: Clock, label: "Xử lý", text: locText(v.processing) },
                        { Icon: Wallet, label: "Phí", text: locText(v.fee) },
                      ].map((r) => (
                        <div
                          key={r.label}
                          className="flex gap-3 py-2.5 @[30rem]:px-4 @[30rem]:py-3.5"
                        >
                          <r.Icon className="mt-0.5 size-4 shrink-0 text-brand-600/70" />
                          <div className="min-w-0 flex-1">
                            <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                              {r.label}
                            </dt>
                            <dd className="mt-0.5 text-[13px] leading-relaxed font-medium text-slate-700">
                              {r.text || "—"}
                            </dd>
                          </div>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <footer className="border-t border-slate-100 px-4 py-2.5">
                    <ItemActions
                      path={VISA}
                      item={v}
                      tags={TAGS}
                      onDone={patchItem(visas)}
                      onEdit={() => setVisa(v)}
                      onRemove={() => removeVisa(v)}
                    />
                  </footer>
                </article>
              )}
            </Sortable>
          )}
          <Pagination bare unit="loại visa" meta={visaPaged.meta} onPage={visaPaged.setPage} />
        </Card>

        <Card
          title="Gói fast-track"
          description="Giá tính bằng USD theo từng sân bay. Để trống thì website hiện “Giá liên hệ”."
          actions={
            canEdit && (
              <Button size="sm" icon={Plus} onClick={() => setFt(EMPTY_FT)}>
                Thêm gói
              </Button>
            )
          }
          bodyClassName="p-0"
        >
          {fts.error ? (
            <Notice tone="error" className="m-4">
              {fts.error}
            </Notice>
          ) : fts.loading && !fts.items.length ? (
            <LoadingBlock />
          ) : !fts.items.length ? (
            <EmptyState icon={PlaneLanding} title="Chưa có gói fast-track" />
          ) : (
            <div className="divide-y divide-slate-100">
              {GROUPS.map((g) => (
                <FastTrackGroup
                  key={g.value}
                  group={g}
                  list={fts}
                  onEdit={setFt}
                  onAdd={() => setFt({ ...EMPTY_FT, group: g.value })}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {visa && (
        <VisaEditor
          initial={visa}
          nextOrder={visas.items.length + 1}
          onClose={() => setVisa(null)}
          onSaved={() => {
            setVisa(null);
            visas.reload();
          }}
        />
      )}
      {ft && (
        <FastTrackEditor
          initial={ft}
          all={fts.items}
          onClose={() => setFt(null)}
          onSaved={() => {
            setFt(null);
            fts.reload();
          }}
        />
      )}
    </>
  );
}

// độ rộng cột dùng chung cho hàng tiêu đề và hàng dữ liệu (màn hình rộng)
const COL_PRICES = "grid w-full grid-cols-5 gap-2 xl:w-[400px] xl:flex-none";
const COL_ACTIONS = "w-full xl:w-[196px] xl:flex-none xl:pl-4";

/** 1 nhóm gói fast-track: các hàng kéo – thả được, phân trang riêng */
function FastTrackGroup({ group: g, list, onEdit, onAdd }) {
  const rows = list.items.filter((x) => x.group === g.value);
  const paged = usePaged(rows, FT_PAGE);
  const remove = useRemove(FT, "gói fast-track", TAGS, list.reload);
  const reorder = useReorder(list, FT, TAGS);
  const sort = usePagedSort({ all: rows, paged, onReorder: reorder });
  const { canEdit } = usePermission("visa");

  return (
    <section className="py-4">
      <div className="mb-2 flex items-center justify-between gap-3 px-4 sm:px-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <span className="grid size-7 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <g.Icon className="size-4" />
          </span>
          {g.label}
          <span className="text-xs font-medium text-slate-400">({rows.length})</span>
        </h3>
        {canEdit && (
          <Button variant="ghost" size="sm" icon={Plus} onClick={onAdd}>
            Thêm
          </Button>
        )}
      </div>

      {!rows.length ? (
        <p className="px-4 text-xs text-slate-400 sm:px-5">Chưa có gói nào.</p>
      ) : (
        <>
          <div className="hidden items-center gap-3 px-5 pb-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase xl:flex">
            <span className="w-16 shrink-0" />
            <span className="flex-1">Gói</span>
            <span className={COL_PRICES}>
              {AIRPORTS.map((a) => (
                <span key={a.code} className="text-center" title={a.label}>
                  {a.code}
                </span>
              ))}
            </span>
            <span className={COL_ACTIONS} />
          </div>
          <Sortable
            items={paged.items}
            getId={(x) => x.id}
            className="divide-y divide-slate-100 border-t border-slate-100"
            onReorder={sort.onPageReorder}
            highlight={sort.flash}
            disabled={!canEdit}
          >
            {(x, i, drag) => (
              <div
                className={cn(
                  "flex flex-wrap items-center gap-x-3 gap-y-2.5 bg-white px-3 py-2.5 sm:px-5 xl:flex-nowrap",
                  drag.dragging && "rounded-xl ring-2 ring-brand-400",
                )}
              >
                <span className="flex shrink-0 items-center gap-1">
                  {canEdit && (
                    <>
                      <DragHandle {...drag.handle} />
                      <PositionBadge {...sort.badge(x, i)} />
                    </>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900">
                    {locText(x.name)}
                    {x.popular && <Badge tone="amber">Phổ biến</Badge>}
                    {x.vip && <Badge tone="violet">VIP</Badge>}
                  </p>
                </div>
                <div className={COL_PRICES}>
                  {AIRPORTS.map((a) => (
                    <div
                      key={a.code}
                      className="rounded-lg bg-slate-50 py-1.5 text-center whitespace-nowrap tabular-nums xl:bg-transparent xl:py-0"
                    >
                      <span className="block text-[10px] font-semibold text-slate-400 xl:hidden">
                        {a.code}
                      </span>
                      {x.prices?.[a.code] == null ? (
                        <span className="text-xs text-slate-400">Liên hệ</span>
                      ) : (
                        <span className="text-sm font-semibold text-slate-800">
                          {fmtUSD(x.prices[a.code])}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <ItemActions
                  className={COL_ACTIONS}
                  path={FT}
                  item={x}
                  tags={TAGS}
                  onDone={patchItem(list)}
                  onEdit={() => onEdit(x)}
                  onRemove={() => remove(x)}
                />
              </div>
            )}
          </Sortable>
          <Pagination
            bare
            unit="gói"
            className="px-4 pt-3 sm:px-5"
            meta={paged.meta}
            onPage={paged.setPage}
          />
        </>
      )}
    </section>
  );
}

function useEditor(initial, empty, path, label) {
  const isNew = !initial.id;
  const [d, setD] = useState({ ...empty, ...initial });
  const [lang, setLang] = useState(DEFAULT_LANG);
  const [keyTouched, setKeyTouched] = useState(!isNew);
  const { run, busy } = useMutation(TAGS);
  const autoFill = useAutoFill();
  const { toast } = useUi();
  const set = (patch) => setD((x) => ({ ...x, ...patch }));
  const setName = (name) => set({ name, ...(!keyTouched && { key: slugify(slugSource(name)) }) });

  const save = async (toPayload, onSaved) => {
    if (!anyLang(d.name))
      return toast(`Vui lòng nhập tên ${label} ở ít nhất một ngôn ngữ`, "error");
    const { value: v, failed } = await autoFill.fill(d, { lang });
    if (v !== d) setD(v);
    const key = v.key || slugify(slugSource(v.name));
    if (!key) return toast("Vui lòng nhập mã", "error");
    if (key !== v.key) set({ key });
    const body = toPayload({ ...v, key });
    const ok = await run(
      () =>
        isNew
          ? api(path, { method: "POST", body })
          : api(`${path}/${d.id}`, { method: "PUT", body }),
      isNew ? `Đã thêm ${label}` : `Đã lưu ${label}`,
    );
    if (!ok) return;
    if (failed)
      autoFill.offerRetry((t) =>
        api(`${path}/${ok.data?.id ?? d.id}`, {
          method: "PUT",
          body: { ...toPayload({ ...t, key }), order: body.order },
        }),
      );
    onSaved();
  };
  return {
    isNew,
    d,
    setD,
    set,
    setName,
    lang,
    setLang,
    setKeyTouched,
    busy: busy || autoFill.busy,
    save,
  };
}

function KeyField({ e, hint }) {
  return (
    <Field label="Mã (không dấu)" required hint={hint}>
      <Input
        value={e.d.key}
        onChange={(ev) => {
          e.setKeyTouched(true);
          e.set({ key: slugify(ev.target.value) });
        }}
      />
    </Field>
  );
}

function VisaEditor({ initial, nextOrder, onClose, onSaved }) {
  const editVerb = useEditVerb();
  const e = useEditor(initial, EMPTY_VISA, VISA, "loại visa");
  const { d, set, lang } = e;
  return (
    <EditorModal
      title={e.isNew ? "Thêm loại visa" : `${editVerb}: ${locText(initial.name)}`}
      onClose={onClose}
      onSave={() =>
        e.save((x) => ({ ...visaPayload(x), ...(e.isNew && { order: nextOrder }) }), onSaved)
      }
      busy={e.busy}
    >
      <div className="space-y-5">
        <LangBar lang={lang} onLang={e.setLang} form={d} onForm={e.setD} />
        <Field label="Tên loại visa" required>
          <LocInput value={d.name} lang={lang} onChange={e.setName} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Thời gian lưu trú" hint="VD: Tối đa 90 ngày, nhập cảnh nhiều lần">
            <LocInput value={d.stay} lang={lang} onChange={(stay) => set({ stay })} />
          </Field>
          <Field label="Thời gian xử lý" hint="VD: 3–5 ngày làm việc">
            <LocInput
              value={d.processing}
              lang={lang}
              onChange={(processing) => set({ processing })}
            />
          </Field>
        </div>
        <Field label="Phí" hint="Ghi rõ đơn vị, VD: From $25 / person">
          <LocInput value={d.fee} lang={lang} onChange={(fee) => set({ fee })} />
        </Field>
        <Field label="Ghi chú">
          <LocInput
            value={d.note}
            lang={lang}
            multiline
            rows={3}
            onChange={(note) => set({ note })}
          />
        </Field>

        <FormSection title="Thiết lập" className="border-t border-slate-100 pt-5">
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <KeyField e={e} hint="Tự tạo từ tên. Vd: evisa-30-days" />
            <div className="sm:pt-9">
              <Toggle
                checked={d.isActive}
                onChange={(isActive) => set({ isActive })}
                label="Hiện trên website"
              />
            </div>
          </div>
        </FormSection>
      </div>
    </EditorModal>
  );
}

function FastTrackEditor({ initial, all, onClose, onSaved }) {
  const editVerb = useEditVerb();
  const e = useEditor(
    { ...initial, prices: { ...EMPTY_FT.prices, ...initial.prices } },
    EMPTY_FT,
    FT,
    "gói fast-track",
  );
  const { d, set, lang } = e;
  const setPrice = (code, v) => set({ prices: { ...d.prices, [code]: v } });
  // gói mới / đổi nhóm → xếp cuối nhóm đó
  const payload = (x) => ({
    ...ftPayload(x),
    ...((e.isNew || x.group !== initial.group) && {
      order: all.filter((y) => y.group === x.group && y.id !== x.id).length + 1,
    }),
  });

  return (
    <EditorModal
      title={e.isNew ? "Thêm gói fast-track" : `${editVerb}: ${locText(initial.name)}`}
      onClose={onClose}
      onSave={() => e.save(payload, onSaved)}
      busy={e.busy}
    >
      <div className="space-y-5">
        <LangBar lang={lang} onLang={e.setLang} form={d} onForm={e.setD} />
        <Field label="Tên gói" required>
          <LocInput value={d.name} lang={lang} onChange={e.setName} />
        </Field>
        <Field label="Mô tả">
          <LocInput
            value={d.desc}
            lang={lang}
            multiline
            rows={3}
            onChange={(desc) => set({ desc })}
          />
        </Field>

        <FormSection title="Giá theo sân bay (USD)" className="border-t border-slate-100 pt-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {AIRPORTS.map((a) => (
              <label key={a.code} className="block">
                <span className="mb-1 block truncate text-xs font-semibold text-slate-600">
                  {a.code} <span className="font-normal text-slate-400">· {a.label}</span>
                </span>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  placeholder="Liên hệ"
                  value={d.prices?.[a.code] ?? ""}
                  onChange={(ev) => setPrice(a.code, ev.target.value)}
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500">Để trống thì website hiện “Giá liên hệ”.</p>
        </FormSection>

        <FormSection title="Thiết lập" className="border-t border-slate-100 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nhóm" required>
              <Select value={d.group} onChange={(ev) => set({ group: ev.target.value })}>
                {GROUPS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </Select>
            </Field>
            <KeyField e={e} hint="Tự tạo từ tên. Vd: arrival-standard" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Toggle
              checked={d.isActive}
              onChange={(isActive) => set({ isActive })}
              label="Hiện trên website"
            />
            <Toggle
              checked={d.popular}
              onChange={(popular) => set({ popular })}
              label="Phổ biến"
              hint="Gắn nhãn “Phổ biến”"
            />
            <Toggle checked={d.vip} onChange={(vip) => set({ vip })} label="VIP" />
          </div>
        </FormSection>
      </div>
    </EditorModal>
  );
}
