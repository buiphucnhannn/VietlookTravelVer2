"use client";

/**
 * Cắt ảnh trước khi tải lên (dùng chung cho mọi ô ảnh của khu quản trị).
 *
 *   const crop = useImageCrop(cropSpec({ aspect: "aspect-[16/10]", crop: { width: 1600 } }), "tours");
 *   const urls = await crop.uploadFiles(fileList);          // ảnh từ máy
 *   const { urls, failed } = await crop.importLinks(links); // ảnh từ link
 *   const url = await crop.recrop(currentUrl);              // cắt lại ảnh đang dùng
 *   …  {crop.dialog}                                        // đặt 1 lần trong JSX
 *
 * - KHÔNG tải gì lên kho ảnh ở đây: kết quả là link tạm "chờ lưu" (./pendingImages.js) — ảnh chỉ được lưu khi
 *   nhân viên bấm Lưu (usePendingImages().prepare). Huỷ form → không tốn lượt tải.
 * - Ảnh lệch khung (> 3%) → tự mở hộp cắt; vừa khung → giữ nguyên (ảnh quá lớn thì thu nhỏ, giữ chất lượng).
 * - Ảnh lệch khung BẮT BUỘC chọn vùng (không có "dùng nguyên ảnh"). Nhiều ảnh → cắt lần lượt ("Ảnh 2/5"), có "Bỏ qua ảnh này".
 * - Ảnh từ link: hệ thống lấy ảnh về giúp (kiểm tra link là ảnh thật, công khai) rồi xử lý như ảnh từ máy.
 * - Cắt lại ảnh chưa lưu → cắt từ ẢNH GỐC (không cắt chồng lên bản đã cắt).
 * - Ảnh ra luôn vẽ từ ẢNH GỐC đủ độ phân giải (đúng chiều EXIF), thu nhỏ từng nửa / phóng to từng bước ≤ 2×,
 *   làm nét nhẹ sau khi phóng to; xuất WebP 0.92 (JPEG nếu trình duyệt không hỗ trợ), ảnh có nền trong suốt → PNG.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { Check, Crop, ImageIcon, RotateCw, SkipForward, ZoomIn, ZoomOut } from "lucide-react";
import { ApiError, refreshSession } from "@/lib/api";
import { cn } from "@/lib/utils";
import { addPendingImage, isPendingImage, pendingOriginal } from "./pendingImages";
import { Button, Modal, useUi } from "./ui";
// Bộ cắt ảnh chỉ tải khi mở hộp cắt (giảm dung lượng tải ban đầu của trang quản trị)
const Cropper = dynamic(() => import("react-easy-crop"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 animate-pulse bg-slate-800" />,
});

/* =========================================================================
 * Khung khuyến nghị cho từng ô ảnh
 * ========================================================================= */

/** Tỉ lệ từ class Tailwind: aspect-square / aspect-video / aspect-[16/10] / aspect-[1.5] */
export function ratioFromAspect(aspect) {
  const s = String(aspect ?? "");
  if (/\baspect-square\b/.test(s)) return 1;
  if (/\baspect-video\b/.test(s)) return 16 / 9;
  const m = s.match(/aspect-\[(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?\]/);
  if (m) return Number(m[1]) / Number(m[2] ?? 1) || null;
  return null;
}

/** Album / ảnh trong bài: không có khung cố định → chỉ mời cắt khi ảnh quá dọc hoặc quá dài */
export const CROP_PRESETS = {
  gallery: {
    ratio: null,
    width: 1600, // cạnh dài
    range: [1.2, 1.9],
    options: [
      { label: "Ngang", ratio: 3 / 2 },
      { label: "Ngang rộng", ratio: 16 / 9 },
      { label: "Gần vuông", ratio: 4 / 3 },
      { label: "Vuông", ratio: 1 },
    ],
  },
  content: {
    ratio: null,
    width: 1600,
    range: [0.6, 2.4],
    options: [
      { label: "Ngang", ratio: 3 / 2 },
      { label: "Ngang rộng", ratio: 16 / 9 },
      { label: "Vuông", ratio: 1 },
      { label: "Dọc", ratio: 3 / 4 },
    ],
  },
};

/**
 * Gộp khung của ô ảnh: `crop` (vd. { ratio: 16/9, width: 1920 } hoặc CROP_PRESETS.gallery) ưu tiên hơn `aspect`.
 * Bề ngang mặc định: ảnh ngang 1600px, ảnh dọc cao 1600px.
 */
export function cropSpec({ aspect, crop } = {}) {
  if (crop?.ratio === null) return { ...CROP_PRESETS.gallery, ...crop };
  const ratio = crop?.ratio ?? ratioFromAspect(aspect) ?? 16 / 10;
  const width = crop?.width ?? (ratio >= 1 ? 1600 : Math.round(1600 * ratio));
  return { ratio, width, range: null, options: null };
}

const outSize = (spec, ratio) => {
  const w = spec.ratio ? spec.width : ratio >= 1 ? spec.width : Math.round(spec.width * ratio);
  return { w, h: Math.max(1, Math.round(w / ratio)) };
};

/** Ảnh có cần cắt không (lệch khung > 3%, hoặc ngoài khoảng cho phép của album) */
export function needsCrop(w, h, spec) {
  if (!w || !h) return false;
  const r = w / h;
  if (spec.ratio) return Math.abs(r - spec.ratio) / spec.ratio > 0.03;
  return !!spec.range && (r < spec.range[0] || r > spec.range[1]);
}

const closestOption = (spec, r) =>
  spec.options.reduce((best, o) =>
    Math.abs(Math.log(o.ratio / r)) < Math.abs(Math.log(best.ratio / r)) ? o : best,
  ).ratio;

/* =========================================================================
 * Đọc / vẽ / xuất ảnh
 * ========================================================================= */

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const SERVER_LIMIT = 8 * 1024 * 1024; // be/src/middlewares/upload.middleware.js
const TARGET_LIMIT = 7.5 * 1024 * 1024;
const MAX_INPUT = 40 * 1024 * 1024; // ảnh lớn hơn 8MB vẫn nhận: thu nhỏ + nén lại trên máy trước khi gửi
const HUGE_SIDE = 4000; // vừa khung nhưng lớn hơn thế này → thu nhỏ
const HUGE_TARGET = 2560;
const MAX_CANVAS_AREA = 16_000_000; // an toàn cho Safari iOS

const CLOUDINARY = /^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\//;
export const isCloudinaryUrl = (u) => typeof u === "string" && CLOUDINARY.test(u);
/** Ảnh có thể cắt lại: ảnh trên kho ảnh của website, ảnh có sẵn trong /images, ảnh vừa chọn (chưa lưu) */
export const canRecrop = (u) =>
  typeof u === "string" &&
  (isPendingImage(u)
    ? pendingOriginal(u)?.type !== "image/gif"
    : (isCloudinaryUrl(u) || /^\/images\/[\w./ ()-]+\.(jpe?g|png|webp|avif)$/i.test(u)) &&
      !/\.(svg|gif|mp4|webm)(\?|$)/i.test(u));

/** Giải mã ảnh ĐẦY ĐỦ độ phân giải, đúng chiều xoay EXIF */
async function decode(blob) {
  try {
    const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
    return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
  } catch {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } finally {
      URL.revokeObjectURL(url);
    }
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
  }
}

const makeCanvas = (w, h) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};
const ctxOf = (c) => {
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
};
const free = (c) => {
  if (c) c.width = c.height = 0;
};

/** Ảnh có điểm trong suốt (logo PNG…) → giữ nền trong suốt khi xuất */
function hasAlpha(src, type) {
  if (!/png|webp|avif|gif/.test(type || "")) return false;
  const k = Math.min(1, 256 / Math.max(src.width, src.height));
  const c = makeCanvas(
    Math.max(1, Math.round(src.width * k)),
    Math.max(1, Math.round(src.height * k)),
  );
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(src.source, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  free(c);
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
  return false;
}

/** Làm nét nhẹ (unsharp mask kiểu Laplace) sau khi phóng to */
function sharpen(canvas, amount) {
  const { width: w, height: h } = canvas;
  if (w < 3 || h < 3) return;
  const ctx = canvas.getContext("2d");
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const s = new Uint8ClampedArray(d);
  const row = w * 4;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * row + x * 4;
      for (let c = 0; c < 3; c++) {
        const p = i + c;
        const lap = 4 * s[p] - s[p - 4] - s[p + 4] - s[p - row] - s[p + row];
        d[p] = s[p] + (amount * lap) / 4;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Vẽ vùng `area` (pixel, trong hệ toạ độ ảnh ĐÃ xoay) của ảnh gốc ra khung outW × outH.
 * Thu nhỏ từng nửa, phóng to từng bước ≤ 2× (smoothing "high"), làm nét nhẹ nếu phóng to.
 */
function renderRegion(src, area, rotation, outW, outH, alpha) {
  const swap = rotation % 180 !== 0;
  const RW = swap ? src.height : src.width;
  const RH = swap ? src.width : src.height;
  const s0 = Math.min(1, Math.sqrt(MAX_CANVAS_AREA / (area.width * area.height)));
  let w = Math.max(1, Math.round(area.width * s0));
  let h = Math.max(1, Math.round(area.height * s0));
  let cur = makeCanvas(w, h);
  const ctx = ctxOf(cur);
  ctx.scale(s0, s0);
  ctx.translate(-area.x, -area.y);
  ctx.translate(RW / 2, RH / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(src.source, -src.width / 2, -src.height / 2);

  const step = (nw, nh) => {
    const next = makeCanvas(nw, nh);
    ctxOf(next).drawImage(cur, 0, 0, nw, nh);
    free(cur);
    cur = next;
    w = nw;
    h = nh;
  };
  const scale = outW / w;
  while (w / 2 >= outW) step(Math.round(w / 2), Math.round(h / 2));
  while (w * 2 < outW) step(w * 2, h * 2);
  if (w !== outW || h !== outH) step(outW, outH);
  if (scale > 1.15 && !alpha) sharpen(cur, scale > 2 ? 0.45 : 0.3);
  return cur;
}

const toBlob = (canvas, type, q) => new Promise((r) => canvas.toBlob(r, type, q));

/** Xuất WebP 0.92 (JPEG nếu trình duyệt không xuất được WebP), PNG nếu có nền trong suốt; giảm dần chất lượng cho vừa giới hạn */
async function encode(canvas, alpha, name) {
  const base = (name || "anh").replace(/\.[a-z0-9]+$/i, "").slice(0, 60) || "anh";
  if (alpha) {
    const png = await toBlob(canvas, "image/png");
    if (png && png.size <= TARGET_LIMIT)
      return new File([png], `${base}.png`, { type: "image/png" });
  }
  let blob = null;
  for (const q of [0.92, 0.88, 0.84, 0.78, 0.7, 0.6, 0.5]) {
    blob = await toBlob(canvas, "image/webp", q);
    if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", q);
    if (blob && blob.size <= TARGET_LIMIT) break;
  }
  if (!blob) throw new Error("encode failed");
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `${base}.${ext}`, { type: blob.type });
}

/** Vùng phần trăm (react-easy-crop) → pixel trên ảnh gốc đã xoay */
function areaPixels(src, pct, rotation) {
  const swap = rotation % 180 !== 0;
  const RW = swap ? src.height : src.width;
  const RH = swap ? src.width : src.height;
  const x = Math.max(0, (pct.x / 100) * RW);
  const y = Math.max(0, (pct.y / 100) * RH);
  return {
    x,
    y,
    width: Math.max(1, Math.min(RW - x, (pct.width / 100) * RW)),
    height: Math.max(1, Math.min(RH - y, (pct.height / 100) * RH)),
  };
}

async function cropToFile(src, alpha, decision, spec, name) {
  const area = areaPixels(src, decision.area, decision.rotation);
  let { w, h } = outSize(spec, decision.ratio);
  // vùng chọn quá nhỏ: không phóng to quá 4× (chỉ to thêm file, không nét hơn)
  if (w > area.width * 4) {
    w = Math.round(area.width * 4);
    h = Math.max(1, Math.round(w / decision.ratio));
  }
  const canvas = renderRegion(src, area, decision.rotation, w, h, alpha);
  try {
    return await encode(canvas, alpha, name);
  } finally {
    free(canvas);
  }
}

/** Giữ nguyên khung; chỉ thu nhỏ khi ảnh quá lớn / file quá nặng */
async function shrinkToFile(src, alpha, name) {
  const long = Math.max(src.width, src.height);
  const k = long > HUGE_SIDE ? HUGE_TARGET / long : 1;
  const w = Math.max(1, Math.round(src.width * k));
  const h = Math.max(1, Math.round(src.height * k));
  const canvas = renderRegion(
    src,
    { x: 0, y: 0, width: src.width, height: src.height },
    0,
    w,
    h,
    alpha,
  );
  try {
    return await encode(canvas, alpha, name);
  } finally {
    free(canvas);
  }
}

const isHuge = (w, h) => Math.max(w, h) > HUGE_SIDE;

/** Chỉ đọc ảnh của website: bản trên Cloudinary (có CORS) hoặc /images cùng tên miền */
async function fetchOwnImage(url) {
  if (!isCloudinaryUrl(url) && !url.startsWith("/images/")) throw new Error("not own image");
  const r = await fetch(url, { mode: "cors", credentials: "omit", cache: "force-cache" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.blob();
}

/**
 * Ảnh từ link: hệ thống lấy ảnh về giúp (chặn link nội bộ, chỉ nhận file ảnh thật) → File trên máy.
 * CHƯA lưu vào kho ảnh — chỉ lưu khi bấm Lưu.
 */
async function fetchLinkImage(link) {
  const go = () =>
    fetch("/api/v1/uploads/images/link-preview", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "image/*, application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "fetch",
      },
      body: JSON.stringify({ url: link.trim() }),
      signal: AbortSignal.timeout(60_000),
    }).catch(() => null);
  let r = await go();
  if (r?.status === 401 && (await refreshSession())) r = await go();
  if (!r) throw new ApiError(0, null);
  if (!r.ok) throw new ApiError(r.status, await r.json().catch(() => null));
  const blob = await r.blob();
  let name = "anh";
  try {
    name = decodeURIComponent(new URL(link).pathname.split("/").pop() || "") || "anh";
  } catch {
    // tên file lạ → dùng tên mặc định
  }
  return new File([blob], name.slice(0, 80), { type: blob.type });
}

/* =========================================================================
 * Hook dùng trong các ô ảnh
 * ========================================================================= */

export function useImageCrop(spec, folder = "misc") {
  const { toast } = useUi();
  const [job, setJob] = useState(null);
  const resolveRef = useRef(null);
  const seq = useRef(0);

  const ask = useCallback(
    (j) =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
        setJob({ ...j, id: ++seq.current, busy: false });
      }),
    [],
  );
  const decide = useCallback((result) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    if (!resolve) return;
    setJob((j) => (j ? { ...j, busy: true } : j));
    resolve(result);
  }, []);
  const close = () => setJob(null);

  // gỡ hộp cắt khi ô ảnh biến mất giữa chừng
  useEffect(() => () => resolveRef.current?.({ type: "cancel" }), []);

  const startRatio = (w, h) => (spec.ratio ? spec.ratio : closestOption(spec, w / h));

  /** Lọc định dạng / dung lượng (ảnh lỗi báo ngay, không chặn các ảnh khác) */
  const acceptable = (f) => {
    if (!ACCEPT.includes(f.type))
      toast(`"${f.name}" không phải ảnh JPG / PNG / WebP / AVIF / GIF`, "error");
    else if (f.size > (f.type === "image/gif" ? SERVER_LIMIT : MAX_INPUT))
      toast(`"${f.name}" quá nặng — hãy chọn ảnh nhỏ hơn`, "error");
    else return true;
    return false;
  };

  /**
   * 1 ảnh trên máy → { file (bản sẽ lưu), original } | "skip" | "cancel".
   * Lệch khung → hỏi vùng cắt; quá lớn → thu nhỏ; còn lại giữ nguyên file.
   */
  const processFile = async (f, index, total, beforeCrop) => {
    // GIF (có thể là ảnh động) giữ nguyên
    if (f.type === "image/gif") return { file: f, original: f };
    let src;
    try {
      src = await decode(f);
    } catch {
      if (f.size <= SERVER_LIMIT) return { file: f, original: f }; // để hệ thống kiểm tra lại khi lưu
      toast(`Không đọc được ảnh "${f.name}"`, "error");
      return "skip";
    }
    try {
      const alpha = hasAlpha(src, f.type);
      let decision = { type: "original" };
      if (needsCrop(src.width, src.height, spec)) {
        beforeCrop?.();
        const url = URL.createObjectURL(f);
        try {
          decision = await ask({
            src: url,
            name: f.name,
            index,
            total,
            natural: { w: src.width, h: src.height },
            ratio: startRatio(src.width, src.height),
            auto: true,
          });
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      if (decision.type === "cancel" || decision.type === "skip") return decision.type;
      if (decision.type === "crop")
        return { file: await cropToFile(src, alpha, decision, spec, f.name), original: f };
      if (isHuge(src.width, src.height) || f.size > SERVER_LIMIT)
        return { file: await shrinkToFile(src, alpha, f.name), original: f };
      return { file: f, original: f };
    } finally {
      src.close();
    }
  };

  const keep = ({ file, original }) => addPendingImage(file, { folder, original });

  /** Ảnh từ máy → danh sách link tạm "chờ lưu" (ảnh bị bỏ qua không có trong danh sách) */
  const uploadFiles = async (files, { max = 10 } = {}) => {
    const picked = [...(files ?? [])].filter(acceptable).slice(0, max);
    const urls = [];
    try {
      for (let i = 0; i < picked.length; i++) {
        const r = await processFile(picked[i], i, picked.length);
        if (r === "cancel") break;
        if (r !== "skip") urls.push(keep(r));
      }
    } finally {
      close();
    }
    return urls;
  };

  /** Ảnh từ link → { urls (link tạm "chờ lưu"), failed }. 1 link lỗi → ném lỗi để báo rõ lý do. */
  const importLinks = async (links, { beforeCrop } = {}) => {
    const urls = [];
    let failed = 0;
    try {
      // lấy song song mọi link (nhanh hơn), sau đó mới cắt lần lượt
      const files = await Promise.allSettled(links.map((l) => fetchLinkImage(l)));
      if (links.length === 1 && files[0].status === "rejected") throw files[0].reason;
      for (let i = 0; i < files.length; i++) {
        const f = files[i].status === "fulfilled" ? files[i].value : null;
        if (!f || !acceptable(f)) {
          failed++;
          continue;
        }
        const r = await processFile(f, i, links.length, beforeCrop);
        if (r === "cancel") break;
        if (r !== "skip") urls.push(keep(r));
      }
    } finally {
      close();
    }
    return { urls, failed };
  };

  /** Cắt lại ảnh đang dùng → link tạm mới | null (huỷ). Ảnh cũ giữ nguyên (có thể đang dùng ở chỗ khác). */
  const recrop = async (url) => {
    if (!canRecrop(url)) return null;
    let src;
    let blob;
    try {
      blob = pendingOriginal(url) ?? (await fetchOwnImage(url));
      src = await decode(blob);
    } catch {
      toast("Không mở được ảnh này để cắt — hãy tải ảnh lên lại", "error");
      return null;
    }
    const objectUrl = URL.createObjectURL(blob);
    try {
      const decision = await ask({
        src: objectUrl,
        index: 0,
        total: 1,
        natural: { w: src.width, h: src.height },
        ratio: startRatio(src.width, src.height),
        auto: false,
      });
      if (decision.type !== "crop") return null;
      const file = await cropToFile(src, hasAlpha(src, blob.type), decision, spec, blob.name);
      return keep({ file, original: blob });
    } finally {
      URL.revokeObjectURL(objectUrl);
      src.close();
      close();
    }
  };

  // gắn thẳng vào <body>: ô ảnh nằm trong hộp thoại khác vẫn hiện đúng, không bị cắt mép
  const dialog = job
    ? createPortal(<CropDialog job={job} spec={spec} onDecide={decide} />, document.body)
    : null;
  return { uploadFiles, importLinks, recrop, dialog };
}

/* =========================================================================
 * Hộp cắt ảnh
 * ========================================================================= */

function CropDialog({ job, spec, onDecide }) {
  const confirmRef = useRef(null);
  const busy = !!job?.busy;
  const many = job?.total > 1;
  return (
    <Modal
      open={!!job}
      onClose={() => !busy && onDecide({ type: "cancel" })}
      size="lg"
      icon={Crop}
      title={job?.auto ? "Chọn phần ảnh muốn hiện" : "Cắt lại ảnh"}
      description={
        job?.auto
          ? "Ảnh khác tỉ lệ với vị trí này — kéo ảnh để chọn phần sẽ hiện trên website."
          : "Kéo ảnh để chọn lại phần muốn hiện."
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => onDecide({ type: "cancel" })} disabled={busy}>
            Huỷ
          </Button>
          {many && (
            <Button
              variant="secondary"
              icon={SkipForward}
              onClick={() => onDecide({ type: "skip" })}
              disabled={busy}
            >
              Bỏ qua ảnh này
            </Button>
          )}
          <Button icon={Check} onClick={() => confirmRef.current?.()} loading={busy}>
            Dùng ảnh này
          </Button>
        </>
      }
    >
      {job && (
        <CropBody key={job.id} job={job} spec={spec} onDecide={onDecide} confirmRef={confirmRef} />
      )}
    </Modal>
  );
}

function CropBody({ job, spec, onDecide, confirmRef }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [ratio, setRatio] = useState(job.ratio);
  const [area, setArea] = useState(null);
  const imgRef = useRef(null);
  const preview = useRef(null);
  const many = job.total > 1;

  // Xem trước: vẽ nhỏ từ ảnh đang hiện trong khung
  useEffect(() => {
    const img = imgRef.current;
    const c = preview.current;
    if (!img || !c || !area || !img.naturalWidth) return;
    const id = requestAnimationFrame(() => {
      const src = { source: img, width: img.naturalWidth, height: img.naturalHeight };
      const px = areaPixels(src, area, rotation);
      const W = ratio >= 1 ? 220 : Math.round(200 * ratio);
      const H = Math.round(W / ratio);
      c.width = W * 2;
      c.height = H * 2;
      const ctx = ctxOf(c);
      const k = c.width / px.width;
      const swap = rotation % 180 !== 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.scale(k, k);
      ctx.translate(-px.x, -px.y);
      ctx.translate((swap ? src.height : src.width) / 2, (swap ? src.width : src.height) / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -src.width / 2, -src.height / 2);
    });
    return () => cancelAnimationFrame(id);
  }, [area, rotation, ratio]);

  // Vùng chọn nhỏ hơn bề ngang khuyến nghị nhiều → nhắc nhẹ
  const swap = rotation % 180 !== 0;
  const chosenW = area ? (area.width / 100) * (swap ? job.natural.h : job.natural.w) : Infinity;
  const need = outSize(spec, ratio).w;
  const small = chosenW < need * 0.8;
  // đã ở mức nhỏ nhất mà vẫn thiếu → do ảnh gốc nhỏ; còn phóng to thì do phóng to quá tay
  const blurHint = !small
    ? ""
    : zoom <= 1.02
      ? `Ảnh gốc hơi nhỏ cho vị trí này nên trên website có thể hơi mờ. Nếu có, nên dùng ảnh rộng từ ${need}px trở lên.`
      : "Đang phóng to nhiều nên ảnh có thể bị mờ — kéo thanh trượt sang trái một chút.";

  useEffect(() => {
    confirmRef.current = () =>
      area && onDecide({ type: "crop", area, rotation: ((rotation % 360) + 360) % 360, ratio });
  }, [area, rotation, ratio, onDecide, confirmRef]);

  return (
    <div className="space-y-4">
      {many && (
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700 ring-1 ring-brand-100">
            Ảnh {job.index + 1}/{job.total}
          </span>
          {job.name && <span className="min-w-0 truncate text-xs text-slate-500">{job.name}</span>}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0 space-y-3">
          <div className="relative h-[min(44svh,360px)] min-h-[220px] overflow-hidden rounded-2xl bg-slate-900 sm:h-[400px]">
            <Cropper
              image={job.src}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={ratio}
              minZoom={1}
              maxZoom={6}
              zoomSpeed={0.6}
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(pct) => setArea(pct)}
              setImageRef={(ref) => (imgRef.current = ref.current)}
              mediaProps={job.remote ? {} : { crossOrigin: "anonymous" }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex min-w-[200px] flex-1 items-center gap-2">
              <button
                type="button"
                aria-label="Thu nhỏ"
                onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
                className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 sm:size-9"
              >
                <ZoomOut className="size-4" />
              </button>
              <input
                type="range"
                min={1}
                max={6}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Phóng to / thu nhỏ"
                className="h-2 min-w-0 flex-1 cursor-pointer rounded-full accent-brand-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
              />
              <button
                type="button"
                aria-label="Phóng to"
                onClick={() => setZoom((z) => Math.min(6, z + 0.25))}
                className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 sm:size-9"
              >
                <ZoomIn className="size-4" />
              </button>
            </div>
            <Button
              size="sm"
              variant="secondary"
              icon={RotateCw}
              onClick={() => setRotation((r) => (r + 90) % 360)}
            >
              Xoay
            </Button>
          </div>

          {spec.options && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-slate-500">Khung:</span>
              {spec.options.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setRatio(o.ratio)}
                  aria-pressed={ratio === o.ratio}
                  className={cn(
                    "h-8 rounded-full px-3 text-xs font-semibold ring-1 transition",
                    ratio === o.ratio
                      ? "bg-brand-600 text-white ring-brand-600"
                      : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="flex items-start gap-3 md:flex-col">
          <canvas
            ref={preview}
            className="w-28 shrink-0 rounded-xl bg-slate-100 shadow-sm ring-1 ring-slate-200 md:w-full"
            style={{ aspectRatio: String(ratio), maxHeight: 260, objectFit: "contain" }}
          />
          <div className="min-w-0 space-y-2 text-xs leading-relaxed text-slate-500">
            <p className="flex items-center gap-1.5 font-semibold text-slate-700">
              <ImageIcon className="size-3.5" /> Ảnh sẽ hiện như thế này
            </p>
            {blurHint && (
              <p className="rounded-lg bg-amber-50 px-2.5 py-2 text-amber-800 ring-1 ring-amber-100">
                {blurHint}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
