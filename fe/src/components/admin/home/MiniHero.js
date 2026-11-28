"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Crop,
  Film,
  GalleryHorizontal,
  HelpCircle,
  ImageIcon,
  ImagePlus,
  Monitor,
  Pause,
  Play,
  Plus,
  Smartphone,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { errorMessage, isAbort } from "@/lib/api";

import {
  canonicalVideo,
  cloudinaryVideo,
  cloudinaryVideoUrl,
  parseVideo,
  videoLinkError,
  videoThumb,
} from "@/lib/video";
import { cn } from "@/lib/utils";
import { canRecrop, useImageCrop } from "../ImageCropper";
import {
  cancelCopy,
  copyDriveVideo,
  copyState,
  isUnsavedVideo,
  useVideoCopies,
} from "../pendingVideos";
import {
  Button,
  ImageUrlDialog,
  Input,
  Modal,
  Spinner,
  VideoChip,
  VideoHelp,
  anyLang,
  useUi,
} from "../ui";
import {
  EMPTY_SLIDE,
  InlineText,
  L,
  MAX_SLIDES,
  Pic,
  isImage,
  slideBackground,
  validBannerVideo,
  validImage,
} from "./shared";

/**
 * THANH SỬA BANNER — đặt ngay TRÊN trang xem trước (ngoài banner nên không che chữ nào của banner; chữ banner
 * vẫn sửa tại chỗ trên banner):
 * - Dải slide: bấm để xem / sửa slide, kéo thả để đổi thứ tự, × để xoá, "＋ Thêm" thêm slide; "Slide 2/4".
 * - Nút của slide đang chọn: "Đổi ảnh / video" · "Xem video" (bản xem trước chỉ hiện ảnh cho nhẹ).
 * - Bấm vào nền banner (chỗ không có chữ) cũng mở hộp "Ảnh & video của slide".
 * - Ô "Mô tả ngắn trên điện thoại" (máy tính không hiện câu này trên banner; điện thoại hiện thay cho mô tả dài).
 * `sel` = slide đang chọn (cha giữ để nhảy tới slide cần sửa khi lưu) · `media` / `setMedia`: hộp ảnh & video đang mở.
 */
export default function MiniHero({
  banner,
  lang,
  setBanner,
  sel,
  setSel,
  playing,
  setPlaying,
  media,
  setMedia,
}) {
  const { confirm } = useUi();
  const slides = banner.slides;
  const cur = Math.min(sel, slides.length - 1);
  const slide = slides[cur];
  const [drag, setDrag] = useState(-1);
  const [over, setOver] = useState(-1);

  const setSlide = (patch) =>
    setBanner((b) => ({ slides: b.slides.map((s, k) => (k === cur ? { ...s, ...patch } : s)) }));
  /**
   * Video Drive lấy xong (có thể sau vài phút, nhân viên đã sửa phần khác / chuyển slide):
   * thay đúng link Drive đó bằng video đã lấy, trên dữ liệu MỚI NHẤT (không ghi đè các sửa đổi trong lúc chờ).
   */
  const replaceVideo = (from, to) =>
    setBanner((b) => ({
      slides: b.slides.map((s) => (s.video.trim() === from ? { ...s, video: to } : s)),
    }));
  const addSlide = () => {
    setBanner({ slides: [...slides, { ...EMPTY_SLIDE, caption: L() }] });
    setSel(slides.length);
    setMedia(true); // slide mới chưa có gì → mở luôn hộp chọn ảnh / video
  };
  const moveSlide = (from, to) => {
    if (from === to || from < 0 || to < 0) return;
    const next = [...slides];
    const [s] = next.splice(from, 1);
    next.splice(to, 0, s);
    setBanner({ slides: next });
    setSel(Math.max(0, next.indexOf(slide))); // vẫn chọn đúng slide đang sửa
  };
  const removeSlide = async (k) => {
    const s = slides[k];
    const hasContent = s.video || s.poster || s.posterMobile || anyLang(s.caption);
    if (
      hasContent &&
      !(await confirm({
        title: `Xoá slide ${k + 1}?`,
        message: "Video, ảnh và chú thích của slide này sẽ bị gỡ khỏi banner.",
        confirmText: "Xoá slide",
        danger: true,
      }))
    )
      return;
    setBanner({ slides: slides.filter((_, i) => i !== k) });
    setSel(Math.max(0, k <= cur ? cur - 1 : cur));
    setMedia(false);
  };
  const bad = (s) => !validBannerVideo(s.video.trim()) || !validBannerVideo(s.videoMobile.trim());
  const hasVideo = !!slide && !!(slide.video || "").trim();

  return (
    <>
      {/* ----- Thanh sửa banner: nằm NGAY TRÊN trang (ngoài banner) → không che chữ nào của banner ----- */}
      <div
        data-edit-ui
        className="flex flex-col gap-2 border-b border-slate-200 bg-white px-3 py-2.5 font-sans text-xs text-slate-600 sm:px-3.5"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex shrink-0 items-center gap-1.5 font-semibold text-slate-800">
            <GalleryHorizontal className="size-4 text-blue-600" /> Banner
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 tabular-nums">
              {slide ? `Slide ${cur + 1}/${slides.length}` : "Chưa có slide"}
            </span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {slides.map((s, i) => (
              <SlideThumb
                key={i}
                slide={s}
                index={i}
                active={i === cur}
                bad={bad(s)}
                over={over === i && drag >= 0 && drag !== i}
                onSelect={() => setSel(i)}
                onRemove={() => removeSlide(i)}
                dnd={{
                  draggable: slides.length > 1,
                  onDragStart: (e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(i));
                    setDrag(i);
                  },
                  onDragEnd: () => {
                    setDrag(-1);
                    setOver(-1);
                  },
                  onDragOver: (e) => {
                    if (drag < 0) return;
                    e.preventDefault();
                    if (over !== i) setOver(i);
                  },
                  onDrop: (e) => {
                    if (drag < 0) return;
                    e.preventDefault();
                    moveSlide(drag, i);
                    setDrag(-1);
                    setOver(-1);
                  },
                }}
              />
            ))}
            {slides.length < MAX_SLIDES && (
              <button
                type="button"
                onClick={addSlide}
                title={`Thêm slide (tối đa ${MAX_SLIDES})`}
                className="flex h-9 min-w-16 shrink-0 items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 font-semibold whitespace-nowrap text-slate-500 transition-colors duration-150 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
              >
                <Plus className="size-3.5" /> Thêm
              </button>
            )}
            {slides.length > 1 && (
              <span className="px-1 text-[11px] text-slate-400 max-lg:hidden">
                kéo ảnh nhỏ để đổi thứ tự
              </span>
            )}
          </div>
          {slide && (
            <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
              {bad(slide) && (
                <button
                  type="button"
                  onClick={() => setMedia(true)}
                  className="ring-sun-200 inline-flex h-8 items-center gap-1 rounded-lg bg-sun-50 px-2.5 font-semibold text-sun-700 ring-1 hover:bg-sun-100"
                >
                  <AlertTriangle className="size-3.5" /> Video chưa dùng được — bấm để sửa
                </button>
              )}
              <BarBtn icon={ImagePlus} onClick={() => setMedia(true)} primary>
                Đổi ảnh / video
              </BarBtn>
              {hasVideo && (
                <BarBtn icon={playing ? Pause : Play} onClick={() => setPlaying(!playing)}>
                  {playing ? "Dừng video" : "Xem video"}
                </BarBtn>
              )}
            </div>
          )}
        </div>
        {!slide && (
          <p className="text-slate-500">
            Banner đang dùng video có sẵn của website. Bấm “Thêm” để tự chọn ảnh / video.
          </p>
        )}
        {/* Mô tả ngắn cho điện thoại: máy tính không hiện câu này trên banner → sửa ngay trên thanh */}
        <label className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200">
          <span className="flex shrink-0 items-center gap-1 self-center font-semibold text-slate-700">
            <Smartphone className="size-3.5 text-blue-600" /> Mô tả ngắn trên điện thoại:
          </span>
          <InlineText
            value={banner.descriptionShort[lang] ?? ""}
            placeholder={
              anyLang({ ...banner.descriptionShort, [lang]: "" }) ||
              "Để trống thì điện thoại dùng luôn mô tả dài"
            }
            onChange={(v) =>
              setBanner((b) => ({ descriptionShort: { ...b.descriptionShort, [lang]: v } }))
            }
            label="Mô tả ngắn cho điện thoại"
            multiline
            light
            className="min-w-0 flex-1 text-[13px] leading-snug text-slate-700 max-sm:basis-full"
          />
        </label>
      </div>
      {/* ----- Hộp ảnh & video của slide đang chọn ----- */}
      {slide && (
        <Modal
          open={media}
          onClose={() => setMedia(false)}
          size="xl"
          title={`Ảnh & video · Slide ${cur + 1}`}
          description="Máy tính và điện thoại đều phát video. Ảnh chỉ hiện khi mạng yếu hoặc video chưa tải được."
          footer={
            <>
              <Button
                variant="danger"
                icon={Trash2}
                onClick={() => removeSlide(cur)}
                className="mr-auto"
              >
                Xoá slide
              </Button>
              <Button onClick={() => setMedia(false)}>Xong</Button>
            </>
          }
        >
          <div key={`${cur}-${slides.length}`}>
            <div className="grid gap-4 md:grid-cols-3">
              <SlideVideo
                value={slide.video}
                onChange={(video) => setSlide({ video })}
                onCopied={replaceVideo}
              />
              <SlideImage
                icon={Smartphone}
                label="2. Ảnh dọc cho điện thoại (hiện khi mạng yếu)"
                hint="Điện thoại hiện ảnh này trong lúc video đang tải hoặc khi mạng yếu. Nên chọn ảnh chụp dọc."
                portrait
                value={slide.posterMobile}
                onChange={(posterMobile) => setSlide({ posterMobile })}
              />
              <SlideImage
                icon={ImageIcon}
                label="3. Ảnh hiện trước khi video chạy"
                hint="Không bắt buộc. Máy tính hiện ảnh này trong lúc video đang tải hoặc khi mạng yếu. Để trống sẽ dùng ảnh đầu tiên của video. Nếu slide không có video, máy tính sẽ hiện ảnh này."
                value={slide.poster}
                onChange={(poster) => setSlide({ poster })}
              />
            </div>
            <label className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="shrink-0 font-semibold text-slate-700">
                Chú thích (hiện ở chân banner):
              </span>
              <InlineText
                value={slide.caption[lang] ?? ""}
                placeholder={anyLang({ ...slide.caption, [lang]: "" }) || "Ví dụ: Vịnh Hạ Long"}
                onChange={(v) =>
                  setBanner((b) => ({
                    slides: b.slides.map((s, k) =>
                      k === cur ? { ...s, caption: { ...s.caption, [lang]: v } } : s,
                    ),
                  }))
                }
                label={`Chú thích của slide ${cur + 1}`}
                light
                className="min-w-0 text-sm text-slate-800"
              />
            </label>
            <div className="mt-4 flex flex-wrap items-start gap-x-6 gap-y-3">
              <details className="group/help min-w-0 flex-1 basis-72">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-brand-700 transition-colors hover:text-sun-600 [&::-webkit-details-marker]:hidden">
                  <HelpCircle className="size-3.5" /> Cách lấy link video YouTube / Google Drive
                  <ChevronDown className="size-3.5 transition group-open/help:rotate-180" />
                </summary>
                <div className="mt-2">
                  <VideoHelp banner />
                </div>
              </details>
              {!validBannerVideo(slide.videoMobile.trim()) && (
                <p className="flex flex-wrap items-center gap-2 rounded-xl bg-sun-50 px-3 py-2 text-xs text-sun-700 ring-1 ring-sun-100">
                  Slide này còn một video cũ cho điện thoại không dùng được nữa.
                  <button
                    type="button"
                    onClick={() => setSlide({ videoMobile: "" })}
                    className="font-semibold underline"
                  >
                    Gỡ video cũ
                  </button>
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function BarBtn({ icon: Icon, onClick, primary, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 font-semibold transition-colors duration-150",
        primary
          ? "bg-blue-600 text-white shadow-sm hover:bg-blue-500"
          : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50",
      )}
    >
      <Icon className="size-3.5" /> {children}
    </button>
  );
}

function SlideThumb({ slide, index, active, bad, over, onSelect, onRemove, dnd }) {
  return (
    <span
      {...dnd}
      className={cn(
        "group/thumb relative aspect-video h-9 shrink-0 rounded-lg ring-2 transition-[box-shadow,opacity] duration-150",
        active
          ? "ring-blue-500 ring-offset-1"
          : bad
            ? "ring-sun-500"
            : "opacity-80 ring-slate-200 hover:opacity-100 hover:ring-blue-300",
        over && "opacity-100 ring-blue-400",
        dnd.draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Slide ${index + 1} — bấm để xem và sửa`}
        title={`Slide ${index + 1} · bấm để xem, kéo để đổi thứ tự`}
        aria-pressed={active}
        className="relative grid size-full place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-brand-800 to-brand-600 text-white/50"
      >
        <ImageIcon className="size-4" />
        <Pic src={slideBackground(slide)} sizes="96px" />
        <span className="absolute top-0.5 left-0.5 grid size-4 place-items-center rounded-full bg-slate-950/75 text-[9px] font-bold text-white">
          {index + 1}
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        title={`Xoá slide ${index + 1}`}
        aria-label={`Xoá slide ${index + 1}`}
        draggable={false}
        className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-white text-red-600 opacity-0 shadow ring-1 ring-slate-900/10 transition-opacity duration-150 group-hover/thumb:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

/* ---------- 3 ô video / ảnh của slide: cùng khung, cùng chiều cao, nút cùng một hàng ---------- */

function MediaCard({ icon: Icon, label, hint, error, preview, children }) {
  return (
    <div className="flex flex-col rounded-2xl bg-slate-50/80 p-3.5 ring-1 ring-slate-200">
      <p className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-slate-700">
        <Icon className="size-4 shrink-0 text-brand-600" /> {label}
      </p>
      {preview}
      <div className="mt-3 flex min-h-9 items-center gap-2">{children}</div>
      {error ? (
        <p className="mt-2 flex items-start gap-1 text-xs font-medium text-sun-600">
          <AlertTriangle className="mt-px size-3.5 shrink-0" /> {error}
        </p>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-slate-500">{hint}</p>
      )}
    </div>
  );
}

const FRAME =
  "relative grid h-44 place-items-center overflow-hidden rounded-xl bg-slate-200/70 text-slate-400";

const SITE_VIDEO = /^\/videos\/[\w./-]+\.(mp4|webm)$/i;

/**
 * Video nền (máy tính): dán link YouTube → phát nền bằng YouTube; dán link Google Drive → tự chép video về
 * website (Drive không tự phát làm nền được) rồi phát bằng thẻ video. Ô nhập chỉ hiện link người dùng dán,
 * không hiện link kỹ thuật của video đã chép.
 */
/** 75 giây → "1:15" */
const fmtElapsed = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function SlideVideo({ value, onChange, onCopied }) {
  const { toast } = useUi();
  useVideoCopies(); // vẽ lại khi video đang chuẩn bị xong / lỗi
  const shown = (v) => (cloudinaryVideo(v) ? "" : (v ?? "")); // video đã lấy về → ô nhập trống
  const [text, setText] = useState(shown(value));
  const [lastValue, setLastValue] = useState(value ?? "");
  const [now, setNow] = useState(0);
  if ((value ?? "") !== lastValue) {
    // giá trị đổi từ bên ngoài (hoàn tác, link được chuẩn hoá, lấy xong) → ô nhập hiện theo
    setLastValue(value ?? "");
    setText(shown(value));
  }
  const v = (value ?? "").trim();
  const t = text.trim();
  const copied = cloudinaryVideo(v);
  const site = SITE_VIDEO.test(v) && !v.includes("..");
  const parsed = parseVideo(t);
  // trạng thái lấy video Drive (giữ nguyên khi chuyển slide rồi quay lại)
  const state = parseVideo(v)?.provider === "drive" ? copyState(v) : null;
  const busy = state?.status === "running";
  const failed = state?.status === "failed" ? state.error : "";
  const error = failed || (t && !parsed && !site ? videoLinkError(t) : "");
  const ready = copied && isUnsavedVideo(v);

  // đồng hồ "đã chờ" khi đang chuẩn bị video
  useEffect(() => {
    if (!busy) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [busy]);

  const importDrive = (link) => {
    const from = canonicalVideo(link.trim());
    const note = toast.loading("Đang chuẩn bị video từ Google Drive…");
    copyDriveVideo(link).then(
      (video) => {
        onCopied(from, video.url);
        note.success("Video đã sẵn sàng — bấm Lưu để áp dụng");
      },
      (err) => {
        if (isAbort(err)) return note.dismiss(); // đã gỡ / thay video
        note.error(errorMessage(err), {
          title: "Chưa lấy được video",
          action: { label: "Thử lại", onClick: () => importDrive(link) },
        });
      },
    );
  };

  const commit = (raw) => {
    setText(raw);
    const s = raw.trim();
    const p = parseVideo(s);
    // gỡ / thay video đang chuẩn bị → huỷ (video đã lấy về mà bỏ thì tự được dọn khi không còn trong form)
    if (busy && (!p || canonicalVideo(s) !== v)) cancelCopy(v);
    if (!s) return onChange("");
    // link Drive: tạm giữ link Drive trong lúc chuẩn bị, xong thì thay bằng video đã lấy về
    onChange(p ? canonicalVideo(s) : s);
    if (p?.provider === "drive") importDrive(s);
  };

  const provider = copied ? "drive" : parsed?.provider;
  return (
    <MediaCard
      icon={Monitor}
      label="1. Video (máy tính và điện thoại)"
      hint="Dán link Google Drive hoặc YouTube. Nên dùng video quay ngang, cảnh chính ở giữa khung. Video YouTube chỉ phát trên máy tính — muốn điện thoại cũng phát, hãy dùng link Google Drive."
      error={error}
      preview={
        <div className={cn(FRAME, "bg-slate-800")}>
          {busy ? (
            <span
              className="flex flex-col items-center gap-2 px-4 text-center text-xs text-white/85"
              role="status"
            >
              <Spinner className="size-6 text-white" />
              <b className="text-sm text-white">
                Đang chuẩn bị video…{" "}
                <span className="font-mono tabular-nums">
                  {fmtElapsed(Math.max(0, now - state.startedAt))}
                </span>
              </b>
              Video lớn có thể mất vài phút. Bạn cứ sửa phần khác — bấm Lưu sẽ tự chờ video xong.
              <Button size="sm" variant="soft" onClick={() => commit("")}>
                Huỷ
              </Button>
            </span>
          ) : copied ? (
            <>
              <video
                key={v}
                src={cloudinaryVideoUrl(copied, { width: 720 })}
                poster={videoThumb(v)}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 size-full object-cover"
              />
              {ready && (
                <span
                  role="status"
                  className="absolute inset-x-2 bottom-2 rounded-lg bg-emerald-600/95 px-2.5 py-1.5 text-center text-[11px] font-semibold text-white shadow"
                >
                  Video đã sẵn sàng — bấm Lưu để áp dụng
                </span>
              )}
            </>
          ) : parsed?.provider === "youtube" ? (
            <Pic src={videoThumb(t)} />
          ) : parsed?.provider === "drive" ? (
            // lấy lỗi / bị gián đoạn (tải lại trang khi đang chuẩn bị) → thử lại
            <span className="flex flex-col items-center gap-2 px-4 text-center text-xs text-white/85">
              <Film className="size-6" />
              Chưa lấy được video từ Google Drive.
              <Button size="sm" variant="soft" onClick={() => importDrive(t)}>
                Thử lại
              </Button>
            </span>
          ) : (
            <span className="flex flex-col items-center gap-1.5 px-3 text-center text-xs text-slate-300">
              <Film className="size-6" />
              {site ? "Đang dùng video có sẵn của website" : "Chưa có video"}
            </span>
          )}
          {provider && !busy && (
            <VideoChip provider={provider} className="absolute top-2 left-2 shadow-sm" />
          )}
        </div>
      }
    >
      <span className="relative min-w-0 flex-1">
        <Film className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={text}
          onChange={(e) => commit(e.target.value)}
          placeholder={
            copied ? "Dán link khác để thay video…" : "Dán link YouTube hoặc Google Drive…"
          }
          inputMode="url"
          aria-label="Link video nền"
          aria-invalid={!!error}
          disabled={busy}
          className="h-9 py-0 pl-9 text-xs"
        />
      </span>
      {(t || v || busy) && (
        <Button
          variant="danger"
          size="icon"
          onClick={() => commit("")}
          aria-label="Gỡ video"
          title="Gỡ video"
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </MediaCard>
  );
}

/** Ảnh của slide (dọc hoặc ngang) trong khung cùng chiều cao với ô video */
function SlideImage({ icon, label, hint, portrait, value, onChange }) {
  const { toast } = useUi();
  const [busy, setBusy] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [over, setOver] = useState(false);
  const legacy = !!value && !(isImage(value) && validImage(value));
  // Ảnh dọc: màn hình điện thoại 1080×1920; ảnh ngang: nền toàn màn hình máy tính 2560×1440
  const cropper = useImageCrop(
    portrait ? { ratio: 9 / 16, width: 1080 } : { ratio: 16 / 9, width: 2560 },
    "home",
  );

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
    if (file) run(async () => (await cropper.uploadFiles([file], { max: 1 }))[0], "Đã chọn ảnh");
  };
  const fromLinks = async ([link]) => {
    setBusy(true);
    try {
      const { urls } = await cropper.importLinks([link], { beforeCrop: () => setLinkOpen(false) });
      setLinkOpen(false);
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

  return (
    <MediaCard
      icon={icon}
      label={label}
      hint={hint}
      preview={
        <div
          onDragOver={(e) => (e.preventDefault(), setOver(true))}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            fromFiles(e.dataTransfer.files);
          }}
          className={cn(
            FRAME,
            !value && "border-2 border-dashed border-slate-300 bg-white",
            over && "border-brand-400 bg-brand-50 ring-4 ring-brand-100",
          )}
        >
          {legacy ? (
            <span className="px-3 text-center text-xs">Đang dùng một tệp cũ của website.</span>
          ) : value ? (
            <span
              className={cn(
                "relative h-full overflow-hidden",
                portrait ? "aspect-[3/4] rounded-lg shadow-md ring-1 ring-slate-900/10" : "w-full",
              )}
            >
              <Pic src={value} sizes="420px" />
            </span>
          ) : (
            <span className="flex flex-col items-center gap-1.5 px-3 text-center text-xs">
              <ImagePlus className="size-6" /> Kéo thả ảnh vào đây
            </span>
          )}
          {busy && (
            <span className="absolute inset-0 grid place-items-center bg-white/75 backdrop-blur-[1px]">
              <Spinner />
            </span>
          )}
        </div>
      }
    >
      <Button
        variant="secondary"
        size="sm"
        icon={Upload}
        className="min-w-0 flex-1 px-2"
        onClick={() => setLinkOpen(true)}
      >
        {value ? "Đổi ảnh" : "Thêm ảnh"}
      </Button>
      {canRecrop(value) && (
        <Button
          variant="secondary"
          size="icon"
          onClick={() => run(() => cropper.recrop(value), "Đã cắt lại ảnh")}
          aria-label="Cắt ảnh"
          title="Cắt ảnh"
        >
          <Crop className="size-4" />
        </Button>
      )}
      {value && (
        <Button
          variant="danger"
          size="icon"
          onClick={() => onChange("")}
          aria-label="Bỏ ảnh"
          title="Bỏ ảnh"
        >
          <Trash2 className="size-4" />
        </Button>
      )}
      <ImageUrlDialog
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        onSubmit={fromLinks}
        onFiles={fromFiles}
        busy={busy}
      />
      {cropper.dialog}
    </MediaCard>
  );
}
