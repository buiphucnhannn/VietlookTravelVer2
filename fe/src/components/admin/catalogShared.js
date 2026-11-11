"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, GripVertical, ImageOff, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useMutation } from "./hooks";
import { DragHandle, PositionBadge, Sortable } from "./Sortable";
import { AutoTranslate } from "./translate";
import {
  Button,
  Input,
  LangTabs,
  Modal,
  filledOf,
  locText,
  useUi,
  useUnsavedGuard,
} from "./ui";
import VisibilityToggle from "./VisibilityToggle";
import { ReadOnlyArea, usePermission } from "./permissions";

/**
 * Phần dùng chung của 4 tab danh mục: Điểm đến, Chủ đề, Xe & khu vực, Visa & fast-track.
 */

/** Hàng tab ngôn ngữ của form: tiêu đề bên trái — nút "Dịch tự động" nằm sát bên trái tab ngôn ngữ */
export function LangBar({
  title = "Nội dung theo ngôn ngữ",
  lang,
  onLang,
  form,
  onForm,
  skipKeys,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <div className="flex items-center gap-2">
        <AutoTranslate
          lang={lang}
          value={form}
          onChange={onForm}
          skipKeys={skipKeys}
          className="px-3"
        />
        <LangTabs value={lang} onChange={onLang} filled={filledOf(form.name)} />
      </div>
    </div>
  );
}

/** Tiêu đề nhỏ chia nhóm trong form */
export function FormSection({ title, children, className }) {
  return (
    <section className={cn("space-y-4", className)}>
      {title && <p className="text-sm font-bold text-slate-800">{title}</p>}
      {children}
    </section>
  );
}

/**
 * Đóng popup form (bấm nền mờ, Esc, nút Huỷ / Đóng): form đã sửa mà chưa lưu → hỏi trước, chưa sửa → đóng ngay.
 * `value` = toàn bộ dữ liệu form đang soạn (so với lúc mở popup). Lưu xong, trang cha tự đóng popup → không hỏi.
 * Trong lúc popup có thay đổi: tải lại / đóng tab hoặc bấm link sang trang khác cũng được hỏi (useUnsavedGuard).
 *   const close = useConfirmClose(form, onClose);   <Modal onClose={close} …>
 */
export function useConfirmClose(value, onClose) {
  const { confirm } = useUi();
  const [initial] = useState(() => JSON.stringify(value ?? null));
  const dirty = value !== undefined && JSON.stringify(value) !== initial;
  useUnsavedGuard(dirty);
  return async () => {
    if (
      dirty &&
      !(await confirm({
        title: "Bỏ thay đổi?",
        message: "Nội dung bạn vừa nhập chưa được lưu và sẽ mất nếu đóng cửa sổ này.",
        confirmText: "Bỏ thay đổi",
        cancelText: "Sửa tiếp",
        danger: true,
      }))
    )
      return;
    onClose();
  };
}

/** Popup tạo / sửa: nút Huỷ – Lưu luôn ở góc dưới phải. `value` = dữ liệu form (để hỏi trước khi đóng mất thay đổi) */
export function EditorModal({
  title,
  size = "lg",
  value,
  onClose,
  onSave,
  busy,
  saveLabel,
  children,
}) {
  const { canEdit } = usePermission(); // chỉ xem → form chỉ đọc, chỉ có nút Đóng
  const close = useConfirmClose(value, onClose);
  return (
    <Modal
      open
      size={size}
      onClose={close}
      title={title}
      footer={
        canEdit ? (
          <>
            <Button variant="secondary" onClick={close}>
              Huỷ
            </Button>
            <Button onClick={onSave} loading={busy}>
              {saveLabel || "Lưu"}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={close}>
            Đóng
          </Button>
        )
      }
    >
      <ReadOnlyArea readOnly={!canEdit}>{children}</ReadOnlyArea>
    </Modal>
  );
}

/**
 * Lưu thứ tự mới sau khi kéo – thả.
 *   const reorder = useReorder(list, PATH, TAGS);
 *   reorder(danhSáchĐãXếpLại)   // toàn bộ nhóm đang xếp (vd. mọi điểm đến của 1 miền), không chỉ 1 trang
 */
export function useReorder(list, path, tags) {
  const { run } = useMutation(tags);
  const reorder = async (ordered) => {
    const pos = new Map(ordered.map((x, k) => [x.id, k + 1]));
    list.setItems((xs) =>
      xs
        .map((x) => (pos.has(x.id) ? { ...x, order: pos.get(x.id) } : x))
        .sort((a, b) => a.order - b.order),
    );
    const ok = await run(
      () =>
        api(`${path}/order`, {
          method: "PATCH",
          body: { items: ordered.map((x, k) => ({ id: x.id, order: k + 1 })) },
        }),
      "Đã lưu thứ tự mới",
      { retry: () => reorder(ordered) },
    );
    if (!ok) list.reload();
  };
  return reorder;
}

/** Hỏi lại rồi xoá */
export function useRemove(path, label, tags, reload, note) {
  const { confirm } = useUi();
  const { run } = useMutation(tags);
  return async (x) => {
    const ok = await confirm({
      title: `Xoá ${label}?`,
      message: `"${locText(x.name)}" sẽ bị xoá${note ? `. ${note}` : " khỏi website và không khôi phục được. Nếu chỉ muốn tạm gỡ, hãy ẩn thay vì xoá."}`,
      confirmText: "Xoá",
      danger: true,
    });
    if (!ok) return;
    if (await run(() => api(`${path}/${x.id}`, { method: "DELETE" }), `Đã xoá ${label}`)) reload();
  };
}

/** Tiêu đề popup sửa: "Sửa" khi có quyền sửa, "Xem" khi chỉ được xem (mục của trang đang mở) */
export function useEditVerb() {
  return usePermission().canEdit ? "Sửa" : "Xem";
}

/** Cụm thao tác của 1 mục: ẩn/hiện bên trái — sửa, xoá bên phải */
export function ItemActions({ path, item, tags, onDone, onEdit, onRemove, className }) {
  const { canEdit, canDelete } = usePermission();
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <VisibilityToggle path={path} item={item} tags={tags} onDone={onDone} />
      <div className="flex gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label={canEdit ? "Sửa" : "Xem"}
          title={canEdit ? "Sửa" : "Xem"}
        >
          {canEdit ? <Pencil className="size-4" /> : <Eye className="size-4" />}
        </Button>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label="Xoá"
            title="Xoá"
            className="text-sun-600"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Thẻ có ảnh trong lưới (điểm đến, chủ đề, loại xe, khu vực).
 * Nắm vào phần ảnh + chữ để kéo đổi vị trí; hàng nút bên dưới bấm như thường.
 * `position` = props của <PositionBadge> (sort.badge(item, i)) → hiện số thứ tự cạnh tay nắm,
 * bấm vào để chuyển tới vị trí bất kỳ (kể cả sang trang khác).
 */
export function MediaCard({ image, drag, badges, children, actions, dimmed, position: pos }) {
  const { canEdit } = usePermission();
  const position = canEdit ? pos : undefined; // chỉ xem → không đổi vị trí
  const canDrag = canEdit && Boolean(drag?.handle && Object.keys(drag.handle).length);
  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 transition-shadow hover:shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)]",
        drag?.dragging && "ring-2 ring-brand-400",
      )}
    >
      <div {...(drag?.handle ?? {})} className="flex flex-1 flex-col outline-none">
        <div className="relative aspect-[4/3] bg-slate-100">
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              sizes="(min-width: 1280px) 320px, (min-width: 640px) 45vw, 92vw"
              draggable={false}
              className={cn("object-cover", dimmed && "opacity-60 grayscale")}
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-slate-300">
              <ImageOff className="size-8" />
            </span>
          )}
          {(canDrag || position) && (
            <span className="absolute top-2 left-2 flex items-center gap-1">
              {canDrag && (
                <span
                  title="Giữ và kéo để đổi vị trí"
                  className="grid size-7 place-items-center rounded-lg bg-white/90 text-slate-600 shadow-sm backdrop-blur"
                >
                  <GripVertical className="size-4" />
                </span>
              )}
              {position && <PositionBadge light {...position} />}
            </span>
          )}
          {badges && (
            <span className="absolute top-2 right-2 flex flex-wrap justify-end gap-1">
              {badges}
            </span>
          )}
        </div>
        <div className="flex-1 px-4 pt-3.5 pb-3">{children}</div>
      </div>
      <footer className="border-t border-slate-100 px-3 py-2">{actions}</footer>
    </article>
  );
}

/** Lưới thẻ 1 – 2 – 3 – 4 cột (cỡ trang 8 hoặc 12 luôn lấp đầy hàng) */
export const CARD_GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

/**
 * Danh sách dòng chữ kéo – thả được (điểm nổi bật, dòng xe, phù hợp cho…).
 * Mặc định mỗi mục là 1 chuỗi; mục dạng khác thì truyền text / withText / blank.
 */
export function Lines({
  value = [],
  onChange,
  placeholder = "Nhập nội dung…",
  addLabel = "Thêm dòng",
  max,
  text = (x) => x,
  withText = (_, v) => v,
  blank = "",
}) {
  return (
    <div className="space-y-2">
      <Sortable items={value} onReorder={onChange} className="space-y-2">
        {(item, i, drag) => (
          <div className={cn("flex items-center gap-1.5", drag.dragging && "opacity-80")}>
            <DragHandle {...drag.handle} className="-ml-1.5" />
            <Input
              value={text(item) ?? ""}
              placeholder={placeholder}
              onChange={(e) =>
                onChange(value.map((x, k) => (k === i ? withText(x, e.target.value) : x)))
              }
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange(value.filter((_, k) => k !== i))}
              aria-label="Xoá dòng"
              className="shrink-0 text-sun-600"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </Sortable>
      {(!max || value.length < max) && (
        <Button
          variant="secondary"
          size="sm"
          icon={Plus}
          onClick={() => onChange([...value, blank])}
        >
          {addLabel}
        </Button>
      )}
    </div>
  );
}
