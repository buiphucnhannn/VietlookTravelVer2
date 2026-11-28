"use client";

import { useContext, useState } from "react";
import { Crop, RotateCcw, Trash2, Upload } from "lucide-react";
import { errorMessage } from "@/lib/api";
import { DEFAULT_HOME_IMAGES, HOME_IMAGE_CROPS } from "@/components/home/images";
import { cn } from "@/lib/utils";
import { canRecrop, cropSpec, useImageCrop } from "../ImageCropper";
import { ImageUrlDialog, Spinner, useUi } from "../ui";
import { HomeImagesContext } from "./ImageSlot";

/**
 * ẢNH SỬA TẠI CHỖ trên bản xem trước (dùng chung cho mọi ảnh sửa được — cùng một kiểu thao tác):
 * - Lớp phủ trong suốt đặt ĐÈ lên ảnh thật của website (cha cần `relative`): ảnh website vẫn hiện bên dưới.
 * - Rê chuột: viền xanh 2px + 1 cụm duy nhất ở góc `at` (mặc định trái trên): nhãn xanh "Bấm để đổi ảnh · tên ô",
 *   ngay dưới là hàng nút trắng: `children` (vd. bộ chọn ảnh 1 · 2 · 3), "Cắt ảnh" (ảnh trong kho ảnh),
 *   "Về ảnh mặc định" (ô có ảnh có sẵn của website, đang dùng ảnh khác) hoặc "Bỏ ảnh" (`removable`).
 * - Bấm vào ảnh: hộp "Đổi ảnh" (tải ảnh từ máy / dán link → cắt đúng khung).
 * - Kéo thả tệp ảnh vào ảnh cũng đổi được.
 * Nút / nhãn giữ cỡ thật dù trang đang thu nhỏ (biến --pz của khung xem trước).
 *
 *   <EditableImage value={url} fallback={urlMacDinh} onChange={setUrl} crop={{ ratio: 16 / 10, width: 1600 }}
 *     label="Ảnh thẻ dịch vụ" />
 * `center={[x, y]}` (% khung): nhãn + nút đặt quanh điểm này thay vì ở góc (ảnh khung tròn / hình cánh sao).
 * `tint`: tô xanh nhạt cả ảnh khi rê chuột thay cho viền (khung bị cắt hình, viền không thấy được).
 * `children`: nút thêm đặt chung hàng nút của ảnh (vd. bộ chọn ảnh 1 · 2 · 3).
 * `at`: "tl" | "tr" | "bl" | "br" — góc đặt cụm nhãn + nút (chọn góc không đụng huy hiệu / ảnh bên cạnh).
 */
export function EditableImage({
  value,
  fallback,
  onChange,
  crop,
  aspect,
  folder = "home",
  label,
  removable,
  center,
  at = "tl",
  tint,
  className,
  children,
}) {
  const { toast } = useUi();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const cropper = useImageCrop(cropSpec({ aspect, crop }), folder);
  const isDefault = !!fallback && value === fallback;
  const croppable = canRecrop(value);

  const run = async (job, done) => {
    setBusy(true);
    try {
      const url = await job();
      if (url) {
        onChange(url);
        toast(done);
      }
      return true;
    } catch (err) {
      toast(errorMessage(err), "error");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const fromFiles = (files) => {
    const file = [...(files ?? [])].find((f) => f.type.startsWith("image/"));
    if (file)
      run(
        async () => (await cropper.uploadFiles([file], { max: 1 }))[0],
        "Đã chọn ảnh — bấm Lưu để lưu lại",
      );
  };
  const fromLinks = async ([link]) => {
    setBusy(true);
    try {
      const { urls } = await cropper.importLinks([link], { beforeCrop: () => setOpen(false) });
      setOpen(false);
      if (urls[0]) {
        onChange(urls[0]);
        toast("Đã thêm ảnh từ link — bấm Lưu để lưu lại");
      }
      return true;
    } catch (err) {
      toast(errorMessage(err), "error");
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Sự kiện từ hộp thoại (vẽ ra ngoài bằng portal) vẫn nổi bọt qua cây React → chỉ nhận sự kiện trong khung ảnh
  const inside = (e) => e.currentTarget.contains(e.target);
  // cụm quanh 1 điểm (`center`: cánh sao, ảnh tròn — chỗ hẹp): nút chỉ có biểu tượng, chữ ở chú thích khi rê chuột
  const chip = (icon, text, onClick, danger) => (
    <OverlayChip icon={icon} label={text} danger={danger} onClick={onClick} iconOnly={!!center} />
  );
  const chips = (
    <>
      {croppable && chip(Crop, "Cắt ảnh", () => run(() => cropper.recrop(value), "Đã cắt lại ảnh"))}
      {fallback && !isDefault
        ? chip(RotateCcw, "Về ảnh mặc định", () => {
            onChange(fallback);
            toast("Đã trả về ảnh mặc định — bấm Lưu để lưu lại");
          })
        : null}
      {!fallback && removable && value ? chip(Trash2, "Bỏ ảnh", () => onChange(""), true) : null}
    </>
  );
  const tag = (
    <span className="pointer-events-none inline-flex max-w-[16rem] items-center gap-1 rounded-md bg-blue-600 px-2 py-1 font-sans text-[11px] leading-none font-semibold tracking-normal whitespace-nowrap text-white normal-case shadow-lg">
      <Upload className="size-3 shrink-0" />
      Bấm để đổi ảnh
      {label && <span className="truncate font-normal text-white/80">· {label}</span>}
    </span>
  );
  const compactTag = (
    <span
      aria-hidden
      className="pointer-events-none grid size-7 place-items-center rounded-full bg-blue-600 text-white shadow-lg ring-2 ring-white"
    >
      <Upload className="size-3.5" />
    </span>
  );
  const show =
    "opacity-0 group-hover/img:opacity-100 group-focus-visible/img:opacity-100 [@media(hover:none)]:opacity-100";

  return (
    <div
      data-edit-ui
      role="button"
      tabIndex={0}
      aria-label={label ? `Đổi ảnh: ${label}` : "Đổi ảnh"}
      onClick={(e) => {
        if (!inside(e)) return;
        e.preventDefault();
        e.stopPropagation();
        setOpen(true);
      }}
      onKeyDown={(e) => {
        if (!inside(e) || e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen(true);
        }
      }}
      onDragOver={(e) => {
        if (!inside(e) || !e.dataTransfer?.types?.includes("Files")) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!inside(e) || !e.dataTransfer?.files?.length) return;
        e.preventDefault();
        setOver(false);
        fromFiles(e.dataTransfer.files);
      }}
      className={cn(
        "group/img absolute inset-0 z-10 cursor-pointer outline-none",
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:transition-opacity after:duration-150",
        tint
          ? "after:bg-blue-500/20 after:opacity-0 hover:after:opacity-100"
          : "after:opacity-0 after:ring-2 after:ring-blue-500 after:ring-inset hover:after:opacity-100 focus-visible:after:opacity-100 [@media(hover:none)]:after:opacity-40",
        over && "after:bg-blue-500/25 after:opacity-100",
        className,
      )}
    >
      {center ? (
        // Cụm quanh 1 điểm (cánh sao, ảnh tròn): nhãn GỌN (tên ô ở dòng chú thích) + nút cùng 1 hàng, tên địa điểm
        // ngay dưới → cụm thấp, hẹp; điểm đặt được kéo vào trong khung (không tràn mép ngoài / chạm logo ở tâm sao)
        <span
          className="pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
          style={{ left: `${clamp(center[0], 32, 68)}%`, top: `${clamp(center[1], 28, 72)}%` }}
        >
          <span className="flex [zoom:var(--pz,1)] flex-col items-center gap-1">
            <span className="flex items-center gap-1">
              <span
                className={cn("transition-opacity duration-150", show)}
                title={label ? `Bấm để đổi ảnh · ${label}` : "Bấm để đổi ảnh"}
              >
                {compactTag}
              </span>
              <span
                className={cn(
                  "pointer-events-auto flex gap-1 transition-opacity duration-150 empty:hidden",
                  show,
                )}
              >
                {chips}
              </span>
            </span>
            {children}
          </span>
        </span>
      ) : (
        // 1 cụm duy nhất ở 1 góc: nhãn xanh + hàng nút (bộ chọn ảnh, Cắt ảnh…) → không có 2 cụm chen nhau
        <span
          className={cn(
            "pointer-events-none absolute z-10 flex [zoom:var(--pz,1)] gap-1 p-2 transition-opacity duration-150",
            CORNERS[at] ?? CORNERS.tl,
            show,
          )}
        >
          {tag}
          <span
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "pointer-events-auto flex max-w-[20rem] flex-wrap items-center gap-1 empty:hidden",
              at === "tr" || at === "br" ? "justify-end" : "justify-start",
            )}
          >
            {children}
            {chips}
          </span>
        </span>
      )}
      {busy && (
        <span className="absolute inset-0 z-20 grid place-items-center bg-white/60">
          <Spinner />
        </span>
      )}
      <ImageUrlDialog
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={fromLinks}
        onFiles={fromFiles}
        busy={busy}
        title={label ? `Đổi ảnh · ${label}` : undefined}
      />
      {cropper.dialog}
    </div>
  );
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Góc đặt cụm nhãn + nút của ảnh (`at`): tag luôn sát góc, hàng nút ngay cạnh */
const CORNERS = {
  tl: "top-0 left-0 flex-col items-start",
  tr: "top-0 right-0 flex-col items-end",
  bl: "bottom-0 left-0 flex-col-reverse items-start",
  br: "bottom-0 right-0 flex-col-reverse items-end",
};

/** Nút nhỏ nền trắng trên ảnh (Cắt ảnh, Về ảnh mặc định…) */
export function OverlayChip({ icon: Icon, label, onClick, danger, iconOnly, className }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={iconOnly ? label : undefined}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.(e);
      }}
      className={cn(
        "pointer-events-auto inline-flex h-7 items-center gap-1 rounded-full bg-white/95 font-sans text-[11px] leading-none font-semibold tracking-normal whitespace-nowrap normal-case shadow-md ring-1 ring-slate-900/10 transition-colors duration-150",
        iconOnly ? "w-7 justify-center" : "px-2.5",
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-slate-700 hover:bg-blue-50 hover:text-blue-700",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {!iconOnly && label}
    </button>
  );
}

/* ---------- Ảnh các khối trang chủ (home.images) ---------- */

const getIn = (obj, keys) => keys.reduce((a, k) => a?.[k], obj);
const setIn = (obj, keys, value) => {
  if (!keys.length) return value;
  const [k, ...rest] = keys;
  const next = Array.isArray(obj) || /^\d+$/.test(k) ? [...(obj ?? [])] : { ...obj };
  next[k] = setIn(obj?.[k], rest, value);
  return next;
};
/** Khung cắt của ô: "services.tours" → services, "star.3" → star[3], "b2bNorth.0" → b2b */
const cropOf = (keys) => {
  const [group, i] = keys;
  if (group === "star") return HOME_IMAGE_CROPS.star[Number(i)];
  if (group.startsWith("b2b")) return HOME_IMAGE_CROPS.b2b;
  return HOME_IMAGE_CROPS[group];
};

/**
 * Ảnh 1 ô trang chủ (`path`: "services.tours", "star.3", "b2bNorth.0", "about") phủ lên ảnh website:
 * đang dùng ảnh có sẵn → "Về ảnh mặc định" ẩn; đã thay → hiện. Cần HomeImagesContext.
 */
export function HomeImage({ path, label, ...rest }) {
  const ctx = useContext(HomeImagesContext);
  const keys = String(path).split(".");
  const fallback = getIn(DEFAULT_HOME_IMAGES, keys) || "";
  const value = getIn(ctx?.images, keys) || fallback;
  return (
    <EditableImage
      value={value}
      fallback={fallback || undefined}
      onChange={(v) => ctx?.setImages((imgs) => setIn(imgs, keys, v === fallback ? "" : v))}
      crop={cropOf(keys)}
      label={label}
      {...rest}
    />
  );
}
