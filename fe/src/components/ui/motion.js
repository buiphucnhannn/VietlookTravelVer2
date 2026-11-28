"use client";

import { createContext, useContext } from "react";

/**
 * "Đứng yên": bản xem trước trong trình sửa CMS bọc trang bằng <StillMotion> → các hiệu ứng tự chạy của website
 * (hiện dần khi cuộn, carousel tự lướt, số chạy) đứng yên ở trạng thái cuối. Website không bọc → không đổi gì.
 */
const StillContext = createContext(false);

export function StillMotion({ children }) {
  return <StillContext.Provider value>{children}</StillContext.Provider>;
}

/** true khi đang nằm trong bản xem trước của trình sửa (tắt hiệu ứng tự chạy) */
export const useStillMotion = () => useContext(StillContext);
