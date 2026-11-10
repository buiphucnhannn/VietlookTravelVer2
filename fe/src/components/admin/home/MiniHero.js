"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Crop,
  Film,
  HelpCircle,
  ImageIcon,
  ImagePlus,
  Link2,
  MapPin,
  Monitor,
  Plus,
  Search,
  Smartphone,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { errorMessage } from "@/lib/api";
import { siteConfig } from "@/constants/site";
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
import { Sortable } from "../Sortable";
import {
  Button,
  ImageUrlDialog,
  Input,
  Spinner,
  VideoChip,
  VideoHelp,
  anyLang,
  importDriveVideo,
  useUi,
} from "../ui";
import {
  EMPTY_SLIDE,
  InlineText,
  L,
  MAX_SLIDES,
  Pic,
  grab,
  isImage,
  slideBackground,
  useTap,
  validBannerVideo,
  validImage,
} from "./shared";

/**
 * Banner thu nhỏ: chữ sửa ngay trên ảnh nền; bên dưới là dải slide (kéo để đổi thứ tự) và
 * phần video / ảnh của slide đang chọn.
 * `sel` = vị trí slide đang chọn (cha giữ để có thể nhảy tới slide cần sửa khi lưu).
 */
export default function MiniHero({ banner, lang, setBanner, sel, setSel }) {
  const { confirm } = useUi();
  const slides = banner.slides;
  const cur = Math.min(sel, slides.length - 1);
  const slide = slides[cur];

  /** Thuộc tính cho 1 ô chữ theo ngôn ngữ đang chọn (ô trống → hiện mờ chữ của ngôn ngữ khác) */
  const loc = (key, fallback) => ({
    value: banner[key][lang] ?? "",
    placeholder: anyLang({ ...banner[key], [lang]: "" }) || fallback,
    onChange: (v) => setBanner({ [key]: { ...banner[key], [lang]: v } }),
  });

  const setSlide = (patch) =>
    setBanner({ slides: slides.map((s, k) => (k === cur ? { ...s, ...patch } : s)) });
  const addSlide = () => {
    setBanner({ slides: [...slides, { ...EMPTY_SLIDE, caption: L() }] });
    setSel(slides.length);
  };
  const reorder = (next) => {
    setBanner({ slides: next });
    setSel(Math.max(0, next.indexOf(slide))); // vẫn chọn đúng slide đang sửa
  };
  const removeSlide = async () => {
    const hasContent = slide.video || slide.poster || slide.posterMobile || anyLang(slide.caption);
    if (
      hasContent &&
      !(await confirm({
        title: `Xoá slide ${cur + 1}?`,
        message: "Video, ảnh và chú thích của slide này sẽ bị gỡ khỏi banner.",
        confirmText: "Xoá slide",
        danger: true,
      }))
    )
      return;
    setBanner({ slides: slides.filter((_, k) => k !== cur) });
    setSel(Math.max(0, cur - 1));
  };

  return (
    <section>
      {/* ----- Banner ----- */}
      <div className="relative isolate flex min-h-[460px] items-center justify-center overflow-hidden bg-gradient-to-br from-brand-950 via-brand-800 to-brand-600 text-white sm:min-h-[540px]">
        <Pic src={slideBackground(slide)} sizes="1280px" className="-z-10" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/35 via-black/20 to-black/55" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.3),transparent_65%)]" />

        <div className="flex w-full flex-col items-center px-5 pt-10 pb-16 text-center sm:px-10">
          <InlineText
            {...loc("eyebrow", "Dòng chữ nhỏ")}
            label="Dòng chữ nhỏ phía trên tiêu đề"
            className="text-[0.62rem] font-bold tracking-[0.2em] text-amber-brand uppercase sm:text-xs sm:tracking-[0.35em]"
          />
          <InlineText
            {...loc("titleTop", "Tiêu đề dòng 1")}
            label="Tiêu đề dòng 1"
            className="mt-3 text-2xl leading-none font-extrabold tracking-[-0.04em] [text-shadow:0_4px_12px_rgba(0,0,0,.35)] sm:text-4xl"
          />
          <InlineText
            {...loc("titleMain", "Tiêu đề dòng 2")}
            label="Tiêu đề dòng 2 (chữ lớn)"
            className="mt-2 text-[2.9rem] leading-[0.95] font-extrabold tracking-[-0.06em] [text-shadow:0_6px_18px_rgba(0,0,0,.4)] sm:text-[5.25rem]"
          />
          <InlineText
            {...loc("description", "Mô tả ngắn gọn về công ty, hiện dưới tiêu đề")}
            label="Mô tả dưới tiêu đề"
            multiline
            className="mt-4 max-w-xl text-[0.8rem] leading-snug text-white/90 sm:text-[0.95rem] sm:leading-normal"
          />

          {/* Ô tìm kiếm + huy hiệu đánh giá của trang thật — chỉ để minh hoạ */}
          <div
            aria-hidden
            className="pointer-events-none mt-6 flex w-full max-w-md items-center gap-2 rounded-xl bg-white/95 p-1.5 text-left text-[0.7rem] text-slate-400 shadow-xl select-none"
          >
            <span className="flex flex-1 items-center gap-1.5 px-2">
              <Search className="size-3.5 text-brand-700" /> Tìm tour…
            </span>
            <span className="hidden flex-1 items-center gap-1.5 border-l border-slate-200 px-2 sm:flex">
              <MapPin className="size-3.5 text-brand-700" /> Điểm đến
            </span>
            <span className="grid h-7 place-items-center rounded-lg bg-sun-500 px-3 font-semibold text-white">
              Tìm
            </span>
          </div>
          <div
            aria-hidden
            className="pointer-events-none mt-4 flex items-center gap-6 text-[0.7rem] font-semibold text-white/90 select-none [text-shadow:0_1px_6px_rgba(0,0,0,.6)]"
          >
            <span className="flex items-center gap-1.5">
              Google <Star className="size-3 fill-amber-brand text-amber-brand" />
              {siteConfig.googleRating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1.5">
              Tripadvisor <Star className="size-3 fill-[#34e0a1] text-[#34e0a1]" />
              {siteConfig.tripadvisorRating.score.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Chú thích của slide đang chọn */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1.5 px-5 pb-3.5 text-center">
          {slide ? (
            <InlineText
              value={slide.caption[lang] ?? ""}
              placeholder={
                anyLang({ ...slide.caption, [lang]: "" }) || "Chú thích ảnh, ví dụ: Vịnh Hạ Long"
              }
              onChange={(v) => setSlide({ caption: { ...slide.caption, [lang]: v } })}
              label={`Chú thích của slide ${cur + 1}`}
              className="text-xs font-semibold tracking-wide text-white/90 [text-shadow:0_1px_6px_rgba(0,0,0,.6)] sm:text-[0.8rem]"
            />
          ) : (
            <p className="text-xs text-white/75">
              Chưa có slide nào — trang chủ đang dùng video mặc định.
            </p>
          )}
          {slides.length > 1 && (
            <div className="flex gap-1.5" aria-hidden>
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all",
                    i === cur ? "w-5 bg-white" : "w-1.5 bg-white/45",
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ----- Mô tả ngắn cho điện thoại ----- */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 bg-brand-950 px-4 py-3 text-white sm:px-6">
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold tracking-wide text-amber-brand uppercase">
          <Smartphone className="size-3.5 self-center" /> Bản ngắn cho điện thoại
        </span>
        <InlineText
          {...loc("descriptionShort", "Để trống thì điện thoại dùng luôn mô tả phía trên")}
          label="Mô tả ngắn cho điện thoại"
          multiline
          className="min-w-0 flex-1 basis-56 text-xs leading-relaxed text-white/90"
        />
      </div>

      {/* ----- Dải slide: bấm để chọn, giữ và kéo để đổi thứ tự ----- */}
      <div className="flex flex-wrap items-center gap-2.5 bg-slate-900 px-4 py-3 sm:px-6">
        <Sortable
          items={slides}
          onReorder={reorder}
          layout="horizontal"
          className="flex flex-wrap items-center gap-2.5"
        >
          {(s, i, drag) => (
            <SlideThumb
              slide={s}
              index={i}
              active={i === cur}
              bad={!validBannerVideo(s.video.trim()) || !validBannerVideo(s.videoMobile.trim())}
              onSelect={() => setSel(i)}
              drag={drag}
            />
          )}
        </Sortable>
        {slides.length < MAX_SLIDES && (
          <button
            type="button"
            onClick={addSlide}
            className="flex aspect-video h-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-white/35 text-[10px] font-semibold text-white/80 transition hover:border-white hover:bg-white/10 hover:text-white sm:h-16"
          >
            <Plus className="size-4" /> Thêm slide
          </button>
        )}
        <span className="ml-auto shrink-0 pl-2 text-right text-[11px] leading-relaxed text-white/55">
          {slides.length}/{MAX_SLIDES} slide
          {slides.length > 1 && <span className="block">Giữ và kéo để đổi thứ tự</span>}
        </span>
      </div>

      {/* ----- Video / ảnh của slide đang chọn: 3 ô cùng cỡ ----- */}
      {slide && (
        <div key={`${cur}-${slides.length}`} className="bg-white px-4 py-5 sm:px-6 sm:py-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="text-sm font-bold text-slate-900">
              Slide {cur + 1}
              <span className="ml-2 text-xs font-normal text-slate-500">
                Máy tính phát video, điện thoại hiện ảnh.
              </span>
            </p>
            <Button variant="danger" size="sm" icon={Trash2} onClick={removeSlide}>
              Xoá slide
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <SlideVideo value={slide.video} onChange={(video) => setSlide({ video })} />
            <SlideImage
              icon={Smartphone}
              label="Ảnh nền cho điện thoại"
              hint="Nên dùng ảnh dọc."
              portrait
              value={slide.posterMobile}
              onChange={(posterMobile) => setSlide({ posterMobile })}
            />
            <SlideImage
              icon={ImageIcon}
              label="Ảnh chờ khi video đang tải"
              hint="Không bắt buộc — để trống sẽ dùng ảnh bìa của video."
              value={slide.poster}
              onChange={(poster) => setSlide({ poster })}
            />
          </div>

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
      )}
    </section>
  );
}

function SlideThumb({ slide, index, active, bad, onSelect, drag }) {
  return (
    <button
      type="button"
      {...grab(drag)}
      {...useTap(onSelect)}
      aria-label={`Slide ${index + 1} — bấm để chọn, giữ và kéo để đổi thứ tự`}
      aria-pressed={active}
      className={cn(
        "relative grid aspect-video h-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-brand-800 to-brand-600 text-white/50 ring-2 transition sm:h-16",
        active
          ? "ring-amber-brand"
          : bad
            ? "ring-sun-500"
            : "opacity-70 ring-transparent hover:opacity-100",
        drag.dragging && "opacity-100 ring-white",
      )}
    >
      <ImageIcon className="size-4" />
      <Pic src={slideBackground(slide)} sizes="120px" />
      <span className="absolute top-1 left-1 grid size-4 place-items-center rounded-full bg-slate-950/75 text-[9px] font-bold text-white">
        {index + 1}
      </span>
    </button>
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
function SlideVideo({ value, onChange }) {
  const { toast } = useUi();
  const shown = (v) => (cloudinaryVideo(v) ? "" : (v ?? "")); // video đã chép → ô nhập trống
  const [text, setText] = useState(shown(value));
  const [lastValue, setLastValue] = useState(value ?? "");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(""); // lời báo lỗi khi chép video Drive
  const job = useRef(0);
  if ((value ?? "") !== lastValue) {
    // giá trị đổi từ bên ngoài (hoàn tác, link được chuẩn hoá, chép xong) → ô nhập hiện theo
    setLastValue(value ?? "");
    setText(shown(value));
  }
  const v = (value ?? "").trim();
  const t = text.trim();
  const copied = cloudinaryVideo(v);
  const site = SITE_VIDEO.test(v) && !v.includes("..");
  const parsed = parseVideo(t);
  const error = failed || (t && !parsed && !site ? videoLinkError(t) : "");

  const importDrive = async (link) => {
    const token = ++job.current;
    setBusy(true);
    const note = toast.loading("Đang chép video từ Google Drive… (có thể mất vài chục giây)");
    try {
      const video = await importDriveVideo(link);
      if (token !== job.current) return note.dismiss(); // người dùng đã dán link khác
      onChange(video.url);
      note.success("Đã chép video từ Google Drive");
    } catch (err) {
      if (token !== job.current) return note.dismiss();
      setFailed(errorMessage(err));
      note.error(errorMessage(err), {
        title: "Chưa chép được video",
        action: { label: "Thử lại", onClick: () => importDrive(link) },
      });
    } finally {
      if (token === job.current) setBusy(false);
    }
  };

  const commit = (raw) => {
    setText(raw);
    setFailed("");
    job.current++; // bỏ kết quả của lần chép trước (nếu đang chạy)
    setBusy(false);
    const s = raw.trim();
    const p = parseVideo(s);
    if (!s) return onChange("");
    // link Drive: lưu tạm link Drive (chưa bấm Lưu được) trong lúc chép, chép xong thay bằng video đã chép
    onChange(p ? canonicalVideo(s) : s);
    if (p?.provider === "drive") importDrive(s);
  };

  const provider = copied ? "drive" : parsed?.provider;
  return (
    <MediaCard
      icon={Monitor}
      label="Video nền cho máy tính"
      hint="Dán link YouTube hoặc Google Drive (video ngang). Video tự phát, không tiếng."
      error={error}
      preview={
        <div className={cn(FRAME, "bg-slate-800")}>
          {busy ? (
            <span className="flex flex-col items-center gap-2 px-4 text-center text-xs text-white/85">
              <Spinner className="size-6 text-white" />
              <b className="text-sm text-white">Đang chép video từ Drive…</b>
              Video lớn có thể mất một lúc, cứ tiếp tục sửa phần khác.
            </span>
          ) : copied ? (
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
          ) : parsed?.provider === "youtube" ? (
            <Pic src={videoThumb(t)} />
          ) : parsed?.provider === "drive" ? (
            // chép lỗi / bị gián đoạn (đổi slide khi đang chép) → chép lại
            <span className="flex flex-col items-center gap-2 px-4 text-center text-xs text-white/85">
              <Film className="size-6" />
              Video Drive chưa được chép về website.
              <Button size="sm" variant="soft" onClick={() => (setFailed(""), importDrive(t))}>
                Chép lại
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
  const input = useRef(null);
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
    if (input.current) input.current.value = "";
    if (file) run(async () => (await cropper.uploadFiles([file], { max: 1 }))[0], "Đã tải ảnh lên");
  };
  const fromLinks = async ([link]) => {
    setBusy(true);
    try {
      const { urls } = await cropper.importLinks([link], { beforeCrop: () => setLinkOpen(false) });
      setLinkOpen(false);
      if (urls[0]) {
        onChange(urls[0]);
        toast("Đã thêm ảnh từ link");
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
        onClick={() => input.current?.click()}
      >
        {value ? "Đổi ảnh" : "Tải từ máy"}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        icon={Link2}
        className="min-w-0 flex-1 px-2"
        onClick={() => setLinkOpen(true)}
      >
        Dán link
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
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        hidden
        onChange={(e) => fromFiles(e.target.files)}
      />
      <ImageUrlDialog
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        onSubmit={fromLinks}
        busy={busy}
      />
      {cropper.dialog}
    </MediaCard>
  );
}
