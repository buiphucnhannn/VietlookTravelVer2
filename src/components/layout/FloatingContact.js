"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, MessageCircle, Phone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { smoothScrollTo } from "@/components/fx/SmoothScroll";
import { WeChatIcon, WhatsAppIcon, ZaloIcon } from "@/components/ui/BrandIcons";

/** Nút liên hệ nhanh nổi: WhatsApp, WeChat, Zalo, hotline + về đầu trang. */
export default function FloatingContact({ labels, contact, messaging }) {
  const [open, setOpen] = useState(false);
  const [wechat, setWechat] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const box = useRef(null);

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
      onClick: () => setWechat(true),
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

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(messaging.wechatId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* trình duyệt chặn clipboard – bỏ qua */
    }
  };

  return (
    <>
      <div className="fixed right-4 bottom-[calc(1rem+var(--mobile-bar,0px))] z-40 flex flex-col items-end gap-2.5 transition-[bottom] duration-300 sm:right-5 sm:bottom-[calc(1.25rem+var(--mobile-bar,0px))]">
        {/* Lên đầu trang: sát trên nút chat, ẩn khi danh sách liên hệ đang mở */}
        <button
          type="button"
          onClick={() => smoothScrollTo(0)}
          aria-label={labels.top}
          tabIndex={showTop && !open ? 0 : -1}
          className={cn(
            "grid size-10 place-items-center rounded-full bg-white text-brand-700 shadow-lg ring-1 ring-border transition-all duration-300 hover:-translate-y-0.5",
            showTop && !open ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0",
          )}
        >
          <ArrowUp className="size-4" />
        </button>

        <div ref={box} className="relative">
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
                    <it.icon className={it.key === "zalo" ? "size-8" : "size-5"} />
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
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={labels.contact}
            className="relative grid size-12 place-items-center rounded-full bg-brand-600 text-white shadow-xl shadow-brand-900/30 transition hover:bg-brand-700"
          >
            {!open && (
              <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/40" />
            )}
            {open ? (
              <X className="relative size-5" />
            ) : (
              <MessageCircle className="relative size-5" />
            )}
          </button>
        </div>
      </div>

      {wechat && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-brand-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setWechat(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setWechat(false)}
              className="absolute top-3 right-3 grid size-9 place-items-center rounded-full hover:bg-surface"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#07c160] text-white">
              <WeChatIcon className="size-9" />
            </span>
            <h3 className="mt-4 text-xl font-bold text-ink">{labels.addWeChat}</h3>
            <p className="mt-1 text-sm text-muted">{labels.wechatHint}</p>
            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3">
              <span className="font-mono text-lg font-semibold tracking-wide text-ink">
                {messaging.wechatId}
              </span>
              <button
                type="button"
                onClick={copy}
                className="rounded-lg bg-[#07c160] px-3 py-1.5 text-sm font-semibold text-white"
              >
                {copied ? labels.copied : labels.copy}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
