"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Crop, ImagePlus, RotateCcw } from "lucide-react";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { canRecrop, useImageCrop } from "../ImageCropper";
import { ImageUrlDialog, Spinner, useUi } from "../ui";

/**
 * ĐỔI ẢNH NGAY TRÊN ẢNH — 1 kiểu duy nhất cho mọi ảnh / ảnh nền trên bản xem trước (Giao diện trang, Giới thiệu,
 * chính sách):
 *   - Rê chuột lên phần ẢNH (không phải chữ / nút / thẻ nằm trên ảnh): viền XANH 2px trong khung ảnh + nhãn xanh
 *     "Bấm để đổi ảnh · tên ảnh" ở góc trên bên trái; góc trên bên phải: "Cắt ảnh", "Về ảnh mặc định" (khi có).
 *   - Bấm vào ảnh (hoặc nhãn) → hộp "Đổi ảnh" dùng chung (chọn ảnh trên máy / kéo thả / dán link → cắt cho vừa khung).
 *   - Màn cảm ứng: nhãn nhỏ luôn hiện để biết ảnh nào đổi được; chạm vào ảnh là mở hộp đổi ảnh.
 * <ImageSpot> đặt làm con TRỰC TIẾP của khung ảnh (khung cần `relative`): nó dùng chính khung đó làm vùng bấm,
 * nên chữ / nút nằm trên ảnh vẫn bấm sửa bình thường (chỉ phần nền ảnh trống mới mở hộp đổi ảnh).
 */

/** Phần tử nằm trên ảnh mà bấm vào KHÔNG phải là đổi ảnh */
const INTERACTIVE =
  "a,button,input,textarea,select,label,iframe,video,summary,[data-edit-ui],[inert],[data-inline],[data-auto],[data-img-host],[role=button],[contenteditable=true]";
const MEDIA = new Set(["IMG", "VIDEO", "CANVAS", "PICTURE", "IFRAME"]);
const CLEAR = new Set(["rgba(0, 0, 0, 0)", "transparent"]);

/** Phần tử có "vẽ" gì đó (nền, viền, bóng) — vd. thẻ trắng, hộp form nằm trên ảnh nền */
const painted = (cs) =>
  !CLEAR.has(cs.backgroundColor) ||
  cs.backgroundImage !== "none" ||
  cs.boxShadow !== "none" ||
  parseFloat(cs.borderTopWidth) > 0 ||
  parseFloat(cs.borderLeftWidth) > 0 ||
  cs.backdropFilter !== "none";

/**
 * Con trỏ đang ở phần "nền ảnh" của khung `host`: đi từ phần tử dưới con trỏ lên tới khung, gặp chữ / nút / thẻ có
 * nền / ảnh khác nhỏ hơn khung → không phải ảnh. Lớp phủ màu, khung bố cục trong suốt phủ gần kín khung → vẫn là ảnh.
 */
export function isBare(target, host) {
  const area = host.offsetWidth * host.offsetHeight || 1;
  for (let el = target; el && el !== host; el = el.parentElement) {
    if (!(el instanceof HTMLElement)) return false; // biểu tượng SVG
    if (el.matches(INTERACTIVE)) return false;
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return false;
    if (el.offsetWidth * el.offsetHeight >= area * 0.85) continue; // lớp phủ / khung phủ kín ảnh
    if (MEDIA.has(el.tagName)) return false;
    if (painted(getComputedStyle(el))) return false;
  }
  return true;
}

/**
 * Theo dõi rê chuột / bấm trên khung cha của phần tử `ref` (khung ảnh). Trả về true khi đang rê trên nền ảnh.
 * `onPick(e)`: bấm vào nền ảnh. `onMove(e)` (tuỳ chọn): con trỏ di chuyển trên nền ảnh (vd. chọn ảnh theo cột).
 * `hostSel`: khung ảnh — "parent" (khung cha trực tiếp) hoặc bộ chọn CSS tìm khung bao gần nhất (vd. "section").
 */
export function useImageHost(ref, onPick, onMove, hostSel = "parent") {
  const [on, setOn] = useState(false);
  const cb = useRef({ onPick, onMove });
  useLayoutEffect(() => {
    cb.current = { onPick, onMove };
  });
  useEffect(() => {
    const mark = ref.current;
    const host = !mark ? null : hostSel === "parent" ? mark.parentElement : mark.closest(hostSel);
    if (!host) return;
    host.setAttribute("data-img-host", "");
    let raf = 0;
    const over = (e) => {
      if (mark.contains(e.target)) return; // đang ở nhãn / nút của chính ảnh này
      const bare = isBare(e.target, host);
      setOn(bare);
      host.style.cursor = bare ? "pointer" : "";
    };
    const move = (e) => {
      if (!cb.current.onMove || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        cb.current.onMove?.(e);
      });
    };
    const leave = () => {
      setOn(false);
      host.style.cursor = "";
    };
    // phòng khi trình duyệt không báo "rời khung" (vd. cuộn trang lúc chuột đứng yên): chuột ở ngoài khung → tắt
    const outside = (e) => {
      if (!host.contains(e.target)) leave();
    };
    const click = (e) => {
      if (e.defaultPrevented || mark.contains(e.target) || !isBare(e.target, host)) return;
      e.preventDefault();
      cb.current.onPick?.(e);
    };
    host.addEventListener("mouseover", over);
    host.addEventListener("mousemove", move);
    host.addEventListener("mouseleave", leave);
    host.addEventListener("click", click);
    document.addEventListener("mouseover", outside, { passive: true });
    return () => {
      document.removeEventListener("mouseover", outside);
      cancelAnimationFrame(raf);
      host.removeEventListener("mouseover", over);
      host.removeEventListener("mousemove", move);
      host.removeEventListener("mouseleave", leave);
      host.removeEventListener("click", click);
      host.removeAttribute("data-img-host");
      host.style.cursor = "";
    };
  }, [ref, hostSel]);
  return on;
}

/**
 * Đổi / cắt 1 ảnh: { open(), dialogs, busy, recrop() } — hộp "Đổi ảnh" dùng chung + công cụ cắt ảnh.
 * `onChange(url)`: ảnh mới (ảnh chọn trên máy là link tạm, tải lên kho ảnh khi bấm Lưu).
 */
export function useImageChange({ value, onChange, crop, folder = "pages" }) {
  const { toast } = useUi();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const cropper = useImageCrop(crop ?? { ratio: 16 / 9, width: 1920 }, folder);
  const openDialog = useCallback(() => setOpen(true), []);

  const run = async (job, done) => {
    setBusy(true);
    try {
      const url = await job();
      if (url) {
        onChange(url);
        toast(done);
      }
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
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

  return {
    busy,
    open: openDialog,
    canCrop: canRecrop(value),
    recrop: () => run(() => cropper.recrop(value), "Đã cắt lại ảnh"),
    dialogs: (
      <>
        <ImageUrlDialog
          open={open}
          onClose={() => setOpen(false)}
          onSubmit={fromLinks}
          onFiles={([file]) =>
            file &&
            run(
              async () => (await cropper.uploadFiles([file], { max: 1 }))[0],
              "Đã chọn ảnh — bấm Lưu để lưu lại",
            )
          }
          busy={busy}
        />
        {cropper.dialog}
      </>
    ),
  };
}

/* ---------- Nhãn & nút trên ảnh (cỡ thật, không bị thu nhỏ theo bản xem trước nhờ --pz) ---------- */

const TAG =
  "pointer-events-auto flex max-w-full min-w-0 [zoom:var(--pz,1)] items-center gap-1 rounded-md bg-blue-600 px-2 py-1 font-sans text-[11px] leading-none font-semibold tracking-normal whitespace-nowrap text-white normal-case not-italic shadow-lg hover:bg-blue-700";
const CHIP =
  "pointer-events-auto inline-flex h-7 items-center gap-1 rounded-full bg-white/95 px-2.5 font-sans text-[11px] leading-none font-semibold tracking-normal whitespace-nowrap text-slate-700 normal-case not-italic shadow-md ring-1 ring-slate-900/10 hover:bg-white hover:text-slate-900";

/** Nút nhỏ góc trên bên phải ảnh ("Cắt ảnh", "Về ảnh mặc định"…) */
export function SpotChip({ icon: Icon, label, onClick, ...rest }) {
  return (
    <button type="button" onClick={onClick} title={label} className={CHIP} {...rest}>
      {Icon && <Icon className="size-3.5 shrink-0" />}
      <span className="max-sm:hidden">{label}</span>
    </button>
  );
}

/**
 * Lớp sửa ảnh phủ lên khung (vẽ viền + nhãn + nút; không chặn chuột). Dùng chung cho ImageSpot và ảnh ghép nhiều cột.
 * `on`: đang rê trên ảnh · `tagAt` / `toolsAt`: vị trí nhãn / cụm nút · `tools`: nút thêm (vd. kéo đổi chỗ).
 * Không truyền `toolsAt`: cụm nút ở góc phải trên; ảnh HẸP (khung `@container` của ImageSpot hẹp hơn nửa màn hình) →
 * cụm nút xuống ngay dưới nhãn, cùng góc trái → nhãn và nút không chen nhau; ảnh nền cả khối vẫn để nút ở góc phải.
 */
export function SpotLayer({
  on,
  busy,
  label,
  edited,
  canCrop,
  onOpen,
  onCrop,
  onReset,
  tagAt = "top-2 left-2",
  toolsAt,
  tools,
  className,
}) {
  const hasTools = !!(canCrop || edited || tools);
  const toolRow = (
    <span
      className={cn(
        "flex [zoom:var(--pz,1)] flex-wrap items-center gap-1",
        on ? "visible" : "invisible",
      )}
    >
      {tools}
      {canCrop && <SpotChip icon={Crop} label="Cắt ảnh" onClick={onCrop} />}
      {edited && <SpotChip icon={RotateCcw} label="Về ảnh mặc định" onClick={onReset} />}
    </span>
  );
  const editedDot = edited && !on && (
    <span
      aria-hidden
      title="Ảnh đã đổi so với mặc định"
      className="absolute top-0 right-0 size-2.5 [zoom:var(--pz,1)] rounded-full bg-amber-400 ring-2 ring-white"
    />
  );
  return (
    <>
      {on && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-blue-500 ring-inset",
            className,
          )}
        />
      )}
      {/* khung vị trí theo toạ độ trang (thu nhỏ cùng trang) · nhãn / nút bên trong phóng lại cỡ thật (--pz) */}
      <span
        className={cn(
          "pointer-events-none absolute z-[1] flex max-w-[calc(100%-1rem)] flex-col items-start gap-1",
          tagAt,
        )}
      >
        <button
          type="button"
          onClick={onOpen}
          title={label ? `Đổi ảnh — ${label}` : "Đổi ảnh"}
          className={cn(
            TAG,
            on || busy
              ? "visible"
              : "invisible [@media(hover:none)]:visible [@media(hover:none)]:opacity-80",
          )}
        >
          {busy ? (
            <Spinner className="size-3 text-white" />
          ) : (
            <ImagePlus className="size-3 shrink-0" />
          )}
          Bấm để đổi ảnh
          {label && <span className="truncate font-normal text-white/75">· {label}</span>}
        </button>
      </span>
      {hasTools && (
        <span
          className={cn(
            "pointer-events-none absolute z-[1] flex",
            toolsAt ??
              "top-2 right-2 [@container_(max-width:50vw)]:top-10 [@container_(max-width:50vw)]:right-auto [@container_(max-width:50vw)]:left-2",
          )}
        >
          {toolRow}
          {editedDot}
        </span>
      )}
    </>
  );
}

/**
 * Ảnh sửa được ngay trên ảnh. Đặt làm con trực tiếp của khung ảnh (`relative`).
 *   value / onChange(url) · crop: { ratio, width } · label: tên ảnh (hiện trên nhãn)
 *   edited + onReset: nút "Về ảnh mặc định" · tagAt / toolsAt: vị trí nhãn / nút (lớp Tailwind)
 *   tools: nút thêm ở góc phải (vd. tay nắm kéo đổi chỗ) · disabled: chỉ xem
 *   host: khung bấm — mặc định khung cha trực tiếp; bộ chọn CSS (vd. "section") → khung bao gần nhất
 */
export function ImageSpot({
  value,
  onChange,
  crop,
  label,
  edited,
  onReset,
  tagAt,
  toolsAt,
  tools,
  folder,
  disabled,
  host,
  className,
}) {
  const { toast } = useUi();
  const ref = useRef(null);
  const img = useImageChange({ value, onChange, crop, folder });
  const on = useImageHost(ref, disabled ? undefined : img.open, undefined, host);
  if (disabled) return <span ref={ref} hidden />;
  return (
    <span
      ref={ref}
      data-edit-ui
      className="@container pointer-events-none absolute inset-0 z-[25] rounded-[inherit]"
    >
      <SpotLayer
        on={on}
        busy={img.busy}
        label={label}
        edited={edited}
        canCrop={img.canCrop}
        onOpen={img.open}
        onCrop={img.recrop}
        onReset={() => {
          onReset?.();
          toast("Đã trả về ảnh mặc định — bấm Lưu để lưu lại");
        }}
        tagAt={tagAt}
        toolsAt={toolsAt}
        tools={tools}
        className={className}
      />
      {img.dialogs}
    </span>
  );
}
