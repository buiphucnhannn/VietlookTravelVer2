"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, MessageCircle, Phone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { smoothScrollTo } from "@/components/fx/SmoothScroll";
import { LineIcon, WeChatIcon, WhatsAppIcon, ZaloIcon } from "@/components/ui/BrandIcons";
import { useA11y } from "./A11y";

const GREET_KEY = "vl-greet-dismissed";
const GREET_DELAY = 4000; // ms sau khi tải trang mới hiện lời chào

/** Đọc / ghi sessionStorage an toàn (chế độ ẩn danh, chặn cookie… có thể ném lỗi) */
const greetDismissed = () => {
  try {
    return sessionStorage.getItem(GREET_KEY) === "1";
  } catch {
    return false;
  }
};
const rememberGreet = () => {
  try {
    sessionStorage.setItem(GREET_KEY, "1");
  } catch {
    /* không lưu được → lần sau hiện lại, không sao */
  }
};

/** Mở nhanh từ nơi khác trên trang (vd. khối liên hệ cạnh lịch trình tour):
 *  window.dispatchEvent(new CustomEvent("vl:contact", { detail: "wechat" | "line" | "menu" })) */
export const openContact = (what = "menu") => {
  window.dispatchEvent(new CustomEvent("vl:contact", { detail: what }));
};

/** Nút liên hệ nhanh nổi: WhatsApp, WeChat, LINE, Zalo, hotline + về đầu trang.
 *  WeChat / LINE không có link mở thẳng tin nhắn → hộp thoại hiện WeChat ID / số điện thoại kèm nút chép.
 *  Lời chào nhỏ hiện sau vài giây (mỗi phiên 1 lần, bấm × là thôi), nằm BÊN TRÁI nút chat → không đè nút
 *  "lên đầu trang" (ở phía trên); tự ẩn khi đè lên khung đặt tour (data-book-card). */
export default function FloatingContact({ labels, contact, messaging }) {
  const a11y = useA11y();
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState(null); // null | "wechat" | "line"
  const [copied, setCopied] = useState(null);
  const [showTop, setShowTop] = useState(false);
  const [greet, setGreet] = useState(false); // lời chào đang bật (chưa bị tắt trong phiên)
  const [blocked, setBlocked] = useState(false); // tạm ẩn vì đang đè khung đặt tour
  const box = useRef(null);
  const bubble = useRef(null);

  // Lời chào: hiện sau GREET_DELAY nếu phiên này khách chưa tắt
  useEffect(() => {
    if (greetDismissed()) return;
    const id = setTimeout(() => setGreet(true), GREET_DELAY);
    return () => clearTimeout(id);
  }, []);

  const dismissGreet = () => {
    setGreet(false);
    rememberGreet();
  };

  // Khối khác trên trang mở menu / hộp thoại WeChat, LINE
  useEffect(() => {
    const onOpen = (e) => {
      const what = e.detail;
      if (what === "wechat" || what === "line") setDialog(what);
      else setOpen(true);
      if (greet) dismissGreet();
    };
    window.addEventListener("vl:contact", onOpen);
    return () => window.removeEventListener("vl:contact", onOpen);
  });

  // Lời chào đè lên khung đặt tour (cột phải trang tour, khung dính) → tạm ẩn, hết đè thì hiện lại
  useEffect(() => {
    if (!greet) return;
    let raf = 0;
    const check = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const b = bubble.current?.getBoundingClientRect();
        if (!b) return;
        const hit = [...document.querySelectorAll("[data-book-card]")].some((el) => {
          const c = el.getBoundingClientRect();
          return (
            c.width > 0 &&
            b.left < c.right &&
            b.right > c.left &&
            b.top < c.bottom &&
            b.bottom > c.top
          );
        });
        setBlocked(hit);
      });
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [greet]);
  const greetShown = greet && !blocked && !open && !dialog;

  // Đang mở: bấm ra ngoài widget hoặc nhấn Esc thì đóng lại
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 700);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const items = [
    {
      key: "whatsapp",
      label: labels.whatsapp,
      icon: WhatsAppIcon,
      color: "bg-[#25d366]",
      href: messaging.whatsapp,
    },
    {
      key: "wechat",
      label: labels.wechat,
      icon: WeChatIcon,
      color: "bg-[#07c160]",
      onClick: () => setDialog("wechat"),
    },
    {
      key: "line",
      label: labels.line,
      icon: LineIcon,
      color: "bg-[#06c755]",
      onClick: () => setDialog("line"),
    },
    {
      key: "zalo",
      label: labels.zalo,
      icon: ZaloIcon,
      color: "bg-[#0068ff]",
      href: messaging.zalo,
    },
    {
      key: "hotline",
      label: `${labels.hotline} ${contact.hotline}`,
      icon: Phone,
      color: "bg-sun-500",
      href: `tel:${contact.hotlineRaw}`,
    },
  ];

  // LINE: chưa có LINE ID → kết bạn bằng số điện thoại (2 số đều dùng LINE)
  const dialogs = {
    wechat: {
      icon: WeChatIcon,
      color: "bg-[#07c160]",
      title: labels.addWeChat,
      hint: labels.wechatHint,
      values: [messaging.wechatId],
    },
    line: {
      icon: LineIcon,
      color: "bg-[#06c755]",
      title: labels.addLine,
      hint: labels.lineHint,
      values: [contact.hotline, contact.hotline2],
    },
  };
  const d = dialog && dialogs[dialog];

  const copy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* trình duyệt chặn clipboard – bỏ qua */
    }
  };

  return (
    <>
      {/* Điện thoại, khung đặt tour đang trên màn hình (MobileBookBar đặt html[data-book-in-view]) → tạm ẩn để
          không che nút 5★ / ô nhập ở mép phải */}
      <div className="fixed right-4 bottom-[calc(1rem+var(--mobile-bar,0px))] z-40 flex flex-col items-end gap-2.5 transition-[bottom,opacity,translate,visibility] duration-300 sm:right-5 sm:bottom-[calc(1.25rem+var(--mobile-bar,0px))] max-lg:[html[data-book-in-view]_&]:invisible max-lg:[html[data-book-in-view]_&]:translate-y-4 max-lg:[html[data-book-in-view]_&]:opacity-0">
        {/* Lên đầu trang: sát trên nút chat, ẩn khi danh sách liên hệ đang mở */}
        <button
          type="button"
          onClick={() => smoothScrollTo(0)}
          aria-label={labels.top}
          tabIndex={showTop && !open ? 0 : -1}
          className={cn(
            "hidden size-10 place-items-center rounded-full bg-white text-brand-700 shadow-lg ring-1 ring-border transition-all duration-300 hover:-translate-y-0.5 sm:grid",
            showTop && !open ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0",
          )}
        >
          <ArrowUp className="size-4" />
        </button>

        <div ref={box} className="relative">
          {/* Lời chào: bong bóng bên trái nút chat, bấm vào = mở menu liên hệ; × = tắt trong phiên này */}
          <div
            ref={bubble}
            role="status"
            aria-live="polite"
            className={cn(
              "absolute right-full bottom-0 mr-3 w-max max-w-[min(17rem,calc(100vw-6rem))] origin-bottom-right transition-[opacity,translate,scale] duration-300 motion-reduce:transition-none",
              greetShown
                ? "translate-x-0 scale-100 opacity-100"
                : "pointer-events-none invisible translate-x-2 scale-95 opacity-0",
            )}
          >
            {greet && (
              <div className="relative rounded-2xl rounded-br-md bg-white py-3 pr-9 pl-4 text-left shadow-xl ring-1 ring-border">
                <button
                  type="button"
                  onClick={() => {
                    dismissGreet();
                    setOpen(true);
                  }}
                  tabIndex={greetShown ? 0 : -1}
                  className="block text-left"
                >
                  <span className="block text-sm leading-snug font-medium text-ink">
                    {labels.greeting}
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                    {labels.greetingCta} <span aria-hidden>→</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={dismissGreet}
                  tabIndex={greetShown ? 0 : -1}
                  aria-label={labels.greetingClose}
                  className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full text-muted transition hover:bg-surface hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
          </div>
          <ul
            className={cn(
              "absolute right-0 bottom-full mb-3 flex flex-col items-end gap-2 transition-all duration-300",
              open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
            )}
          >
            {items.map((it, i) => {
              const Inner = (
                <>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[0.8rem] font-semibold whitespace-nowrap text-ink shadow-md">
                    {it.label}
                  </span>
                  <span
                    className={cn(
                      "grid size-10 place-items-center rounded-full text-white shadow-lg",
                      it.color,
                    )}
                  >
                    <it.icon
                      className={it.key === "zalo" || it.key === "line" ? "size-8" : "size-5"}
                    />
                  </span>
                </>
              );
              return (
                <li key={it.key} style={{ transitionDelay: `${open ? i * 40 : 0}ms` }}>
                  {it.href ? (
                    <a
                      href={it.href}
                      target={it.href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 transition hover:-translate-x-1"
                    >
                      {Inner}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={it.onClick}
                      className="flex items-center gap-2 transition hover:-translate-x-1"
                    >
                      {Inner}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => {
              setOpen((v) => !v);
              if (greet) dismissGreet();
            }}
            aria-expanded={open}
            aria-label={labels.contact}
            className="relative grid size-11 place-items-center rounded-full bg-brand-600 text-white shadow-xl shadow-brand-900/30 transition hover:bg-brand-700 sm:size-12"
          >
            {!open && (
              <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/40 motion-reduce:hidden" />
            )}
            {open ? (
              <X className="relative size-5" />
            ) : (
              <MessageCircle className="relative size-5" />
            )}
          </button>
        </div>
      </div>

      {d && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-brand-950/60 px-3 py-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={d.title}
          onClick={() => setDialog(null)}
        >
          <div
            className="relative max-h-full w-full max-w-sm scrollbar-thin overflow-y-auto overscroll-contain rounded-3xl bg-white px-5 pt-7 pb-6 text-center shadow-2xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setDialog(null)}
              className="absolute top-2.5 right-2.5 grid size-10 place-items-center rounded-full hover:bg-surface"
              aria-label={a11y.close}
            >
              <X className="size-5" />
            </button>
            <span
              className={cn(
                "mx-auto grid size-16 place-items-center rounded-2xl text-white",
                d.color,
              )}
            >
              <d.icon className={dialog === "line" ? "size-14" : "size-9"} />
            </span>
            <h3 className="mt-4 text-xl font-bold text-ink">{d.title}</h3>
            <p className="mt-1 text-sm text-balance text-muted">{d.hint}</p>
            <div className="mt-5 space-y-2.5">
              {d.values.map((v) => (
                <div
                  key={v}
                  className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3"
                >
                  <span className="min-w-0 font-mono text-lg font-semibold tracking-wide break-all text-ink">
                    {v}
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(v)}
                    className={cn(
                      "h-10 shrink-0 rounded-lg px-3.5 text-sm font-semibold text-white",
                      d.color,
                    )}
                  >
                    {copied === v ? labels.copied : labels.copy}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
