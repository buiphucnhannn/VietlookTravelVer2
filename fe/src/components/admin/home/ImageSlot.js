"use client";

import { createContext, useContext } from "react";
import { DEFAULT_HOME_IMAGES } from "@/components/home/images";

/**
 * Ảnh các khối trang chủ sửa ngay trên bản thu nhỏ (home.images trong cài đặt Trang chủ).
 * { images, setImages, starLabels, setStarLabels } — `images` là bản lưu (ô trống = website dùng ảnh có sẵn).
 * Ô ảnh sửa tại chỗ: HomeImage trong ./EditableImage.
 */
export const HomeImagesContext = createContext(null);

const getIn = (obj, keys) => keys.reduce((a, k) => a?.[k], obj);

/** Ảnh đang hiện trên web cho ô `path` (ảnh đã thay, không thì ảnh có sẵn) */
export function useHomeImage(path) {
  const ctx = useContext(HomeImagesContext);
  const keys = String(path).split(".");
  return getIn(ctx?.images, keys) || getIn(DEFAULT_HOME_IMAGES, keys) || "";
}
