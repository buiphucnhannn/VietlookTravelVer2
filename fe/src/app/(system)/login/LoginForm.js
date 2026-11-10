"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Lock,
  User,
  Zap,
} from "lucide-react";
import { ADMIN_BASE, ADMIN_LOGIN } from "@/config/urls.mjs";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Chỉ quay lại đường dẫn nội bộ trong khu quản trị (chặn open redirect) */
function safeNext(raw) {
  const next = String(raw ?? "");
  if (
    !next.startsWith(ADMIN_BASE) ||
    next.startsWith("//") ||
    next.includes("\\") ||
    next.startsWith(ADMIN_LOGIN)
  )
    return ADMIN_BASE;
  return next;
}

/** Mã lỗi backend → câu thông báo thân thiện */
function messageFor(err) {
  if (!(err instanceof ApiError)) return "Đã có lỗi xảy ra, vui lòng thử lại.";
  const minutes = Math.max(1, Math.ceil((err.retryAfter ?? 60) / 60));
  switch (err.code) {
    case "INVALID_CREDENTIALS":
      return "Tên đăng nhập hoặc mật khẩu không đúng.";
    case "ACCOUNT_LOCKED":
      return `Tài khoản tạm khoá do nhập sai nhiều lần. Vui lòng thử lại sau khoảng ${minutes} phút.`;
    case "ACCOUNT_DISABLED":
      return "Tài khoản đã bị vô hiệu hoá. Liên hệ quản trị viên.";
    case "TOO_MANY_REQUESTS":
      return /đăng nhập/i.test(err.message ?? "")
        ? `Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau khoảng ${minutes} phút.`
        : `Bạn thao tác quá nhanh. Vui lòng đợi khoảng ${minutes} phút rồi thử lại.`;
    case "VALIDATION_ERROR":
      return "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.";
    case "CSRF_REJECTED":
    case "BAD_ORIGIN":
      return "Yêu cầu bị từ chối vì lý do bảo mật. Vui lòng tải lại trang.";
    case "NETWORK_ERROR":
      return "Không kết nối được. Vui lòng kiểm tra mạng rồi thử lại.";
    case "BACKEND_UNREACHABLE":
      return "Hệ thống đang khởi động lại. Vui lòng thử lại sau ít giây.";
    default:
      return err.status >= 500 ? "Hệ thống đang bận, vui lòng thử lại sau ít phút." : err.message;
  }
}

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const id = useId();
  const passwordRef = useRef(null);
  const focusPassword = useRef(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | sending | done
  const [error, setError] = useState("");
  const [capsLock, setCapsLock] = useState(false);
  const expired = params.get("expired") === "1";
  // Bản demo: máy chủ bật DEMO_LOGIN → hiện nút "Đăng nhập nhanh" (không lộ mật khẩu ra trình duyệt)
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    let alive = true;
    api("/auth/demo", { retry: false })
      .then((r) => alive && setDemo(Boolean(r?.data?.enabled)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (status === "sending") return;
    if (!username.trim() || !password)
      return setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
    setStatus("sending");
    setError("");
    try {
      await api("/auth/login", {
        method: "POST",
        body: { username: username.trim(), password, remember },
        retry: false,
      });
      setStatus("done");
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch (err) {
      setStatus("idle");
      setError(messageFor(err));
      setPassword(""); // xoá mật khẩu sai, giữ tên đăng nhập
      focusPassword.current = true;
    }
  };

  const demoLogin = async () => {
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      await api("/auth/demo-login", { method: "POST", retry: false });
      setStatus("done");
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch (err) {
      setStatus("idle");
      setError(messageFor(err));
    }
  };

  useEffect(() => {
    if (status !== "idle" || !focusPassword.current) return;
    focusPassword.current = false;
    passwordRef.current?.focus();
  }, [status, error]);

  const busy = status !== "idle";
  const wrap =
    "flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 transition focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100";

  return (
    <form onSubmit={submit} noValidate className="mt-9 space-y-5">
      {expired && !error && (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800 ring-1 ring-brand-100"
        >
          <Info className="mt-0.5 size-4 shrink-0" /> Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập
          lại.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="flex animate-fade-up items-start gap-2.5 rounded-xl bg-sun-50 px-4 py-3 text-sm text-sun-700 ring-1 ring-sun-100"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}

      <div>
        <label htmlFor={`${id}-u`} className="mb-1.5 block pl-1 text-sm font-medium text-slate-600">
          Tên đăng nhập
        </label>
        <div className={wrap}>
          <User className="size-[18px] shrink-0 text-slate-400" />
          <input
            id={`${id}-u`}
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={busy}
            placeholder="Nhập tên đăng nhập"
            className="h-12 w-full bg-transparent text-base text-ink outline-none placeholder:text-slate-400 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-p`} className="mb-1.5 block pl-1 text-sm font-medium text-slate-600">
          Mật khẩu
        </label>
        <div className={wrap}>
          <Lock className="size-[18px] shrink-0 text-slate-400" />
          <input
            ref={passwordRef}
            id={`${id}-p`}
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyUp={(e) => setCapsLock(e.getModifierState?.("CapsLock") ?? false)}
            disabled={busy}
            placeholder="Nhập mật khẩu"
            className="h-12 w-full bg-transparent text-base text-ink outline-none placeholder:text-slate-400 sm:text-sm"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:text-brand-700"
          >
            {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        </div>
        {capsLock && <p className="mt-1.5 pl-1 text-xs text-amber-700">Caps Lock đang bật.</p>}
      </div>

      {/* Ghi nhớ đăng nhập: giữ 7 ngày trên thiết bị này. Không chọn (mặc định, an toàn cho máy dùng chung):
          đóng trình duyệt là tự đăng xuất. Mật khẩu KHÔNG được lưu ở đâu cả. */}
      <label
        htmlFor={`${id}-r`}
        title="Không nên chọn trên máy tính dùng chung"
        className="group mx-auto flex w-fit cursor-pointer items-center gap-2.5 select-none"
      >
        <span className="relative grid size-[18px] shrink-0 place-items-center">
          <input
            id={`${id}-r`}
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={busy}
            className="peer size-[18px] cursor-pointer appearance-none rounded-[5px] border-[1.5px] border-slate-300 bg-white transition checked:border-brand-700 checked:bg-brand-700 focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none"
          />
          <Check
            className="pointer-events-none absolute size-3 scale-50 text-white opacity-0 transition peer-checked:scale-100 peer-checked:opacity-100"
            strokeWidth={3.5}
          />
        </span>
        <span className="text-sm text-slate-600 transition group-hover:text-brand-800">
          Ghi nhớ đăng nhập
        </span>
      </label>

      <button
        type="submit"
        disabled={busy}
        className={cn(
          "group relative flex h-[52px] w-full items-center justify-center rounded-full bg-brand-800 px-14 text-xs font-semibold tracking-[0.18em] text-white uppercase transition hover:bg-brand-900",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-70",
        )}
      >
        {busy ? (status === "done" ? "Đang chuyển trang…" : "Đang đăng nhập…") : "Đăng nhập"}
        <span className="absolute right-1.5 grid size-10 place-items-center rounded-full bg-sun-500 text-white transition-transform group-hover:translate-x-0.5">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
        </span>
      </button>

      {demo && (
        <div className="pt-1">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            Bản dùng thử
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <button
            type="button"
            onClick={demoLogin}
            disabled={busy}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-brand-800 ring-1 ring-slate-200 transition hover:bg-brand-50 hover:ring-brand-200 focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none disabled:opacity-60"
          >
            <Zap className="size-4 text-sun-500" />
            Đăng nhập nhanh (không cần mật khẩu)
          </button>
        </div>
      )}
    </form>
  );
}
