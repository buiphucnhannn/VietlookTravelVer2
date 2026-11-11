"use client";

import { createContext, useContext } from "react";
import { DEFAULT_HOME_IMAGES, HOME_IMAGE_CROPS } from "@/components/home/images";
import { cn } from "@/lib/utils";
import { ImageField } from "../ui";

/**
 * Ảnh các khối trang chủ sửa ngay trên bản thu nhỏ (home.images trong cài đặt Trang chủ).
 * { images, setImages } — `images` là bản lưu (ô trống = website dùng ảnh có sẵn).
 */
export const HomeImagesContext = createContext(null);

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

/** Ảnh đang hiện trên web cho ô `path` (ảnh đã thay, không thì ảnh có sẵn) */
export function useHomeImage(path) {
  const ctx = useContext(HomeImagesContext);
  const keys = String(path).split(".");
  return getIn(ctx?.images, keys) || getIn(DEFAULT_HOME_IMAGES, keys) || "";
}

/**
 * Một ô ảnh với đủ nút "Đổi ảnh / Dán link / Cắt ảnh". Đang dùng ảnh có sẵn → vẫn hiện ảnh đó;
 * "Bỏ ảnh" → trở về ảnh có sẵn của website. `aspect`: lớp tỉ lệ khung đúng như trên web.
 */
export function ImageSlot({ path, aspect, className, style, label }) {
  const ctx = useContext(HomeImagesContext);
  const keys = String(path).split(".");
  const fallback = getIn(DEFAULT_HOME_IMAGES, keys) || "";
  const value = getIn(ctx?.images, keys) || fallback;
  const crop = cropOf(keys);
  return (
    <div className={cn("w-full [&>div]:max-w-none", className)} style={style}>
      <ImageField
        value={value}
        onChange={(v) => ctx?.setImages((imgs) => setIn(imgs, keys, v === fallback ? "" : v))}
        folder="home"
        aspect={aspect}
        crop={crop}
        label={label}
      />
    </div>
  );
}
