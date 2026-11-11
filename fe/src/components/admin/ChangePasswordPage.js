"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Lightbulb,
  Lock,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useCurrentUser } from "./permissions";
import { Button, Card, Field, Input, Notice, PageHeader, useUi } from "./ui";

const EMPTY = { currentPassword: "", newPassword: "", confirm: "" };

const TIPS = [
  {
    Icon: Lightbulb,
    title: "Dài và dễ nhớ với bạn",
    text: "Ghép vài từ quen thuộc thành một câu ngắn, thêm số hoặc ký hiệu — dễ nhớ hơn mà vẫn an toàn.",
  },
  {
    Icon: Lock,
    title: "Chỉ dùng cho trang quản trị",
    text: "Đừng dùng lại mật khẩu của email, Facebook hay ngân hàng.",
  },
  {
    Icon: UserRound,
    title: "Giữ cho riêng mình",
    text: "Không gửi mật khẩu qua tin nhắn. Đồng nghiệp cần vào trang quản trị thì tạo tài khoản riêng cho họ.",
  },
  {
    Icon: LogOut,
    title: "Sau khi đổi",
    text: "Bạn vẫn đang đăng nhập trên máy này. Các máy tính, điện thoại khác sẽ được đăng xuất và cần đăng nhập lại bằng mật khẩu mới.",
  },
];

/** Ô mật khẩu có nút hiện / ẩn riêng */
function PasswordInput({ value, onChange, autoComplete, autoFocus, invalid }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        maxLength={128}
        autoFocus={autoFocus}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        title={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export default function ChangePasswordPage() {
  const { toast } = useUi();
  const username = useCurrentUser()?.username ?? ""; // AdminShell đã tải tài khoản — không hỏi lại /auth/me
  const [d, setD] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (patch) => {
    setError("");
    setD((x) => ({ ...x, ...patch }));
  };
  const mismatch = !!d.confirm && d.newPassword !== d.confirm;

  const submit = async (e) => {
    e.preventDefault();
    if (!d.currentPassword) return setError("Vui lòng nhập mật khẩu hiện tại.");
    if (!d.newPassword) return setError("Vui lòng nhập mật khẩu mới.");
    if (d.newPassword !== d.confirm) return setError("Mật khẩu nhập lại chưa khớp.");
    if (d.newPassword === d.currentPassword)
      return setError("Mật khẩu mới phải khác mật khẩu hiện tại.");
    setBusy(true);
    try {
      await api("/auth/password", {
        method: "PATCH",
        body: { currentPassword: d.currentPassword, newPassword: d.newPassword },
      });
      setD(EMPTY);
      toast("Đã đổi mật khẩu. Các thiết bị khác sẽ được đăng xuất.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Đổi mật khẩu"
        description={
          username
            ? `Đổi mật khẩu đăng nhập của tài khoản ${username}.`
            : "Đổi mật khẩu đăng nhập của bạn."
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Mật khẩu đăng nhập" icon={KeyRound} bodyClassName="h-full">
          <form onSubmit={submit} className="space-y-5" noValidate>
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={username}
              readOnly
              hidden
            />
            <Field label="Mật khẩu hiện tại" required>
              <PasswordInput
                autoComplete="current-password"
                value={d.currentPassword}
                onChange={(currentPassword) => set({ currentPassword })}
                autoFocus
              />
            </Field>
            <Field label="Mật khẩu mới" required>
              <PasswordInput
                autoComplete="new-password"
                value={d.newPassword}
                onChange={(newPassword) => set({ newPassword })}
              />
            </Field>
            <Field
              label="Nhập lại mật khẩu mới"
              required
              error={mismatch ? "Mật khẩu nhập lại chưa khớp" : ""}
            >
              <PasswordInput
                autoComplete="new-password"
                value={d.confirm}
                invalid={mismatch}
                onChange={(confirm) => set({ confirm })}
              />
            </Field>

            {error && <Notice tone="error">{error}</Notice>}

            <div className="flex justify-end border-t border-slate-100 pt-5">
              <Button type="submit" icon={KeyRound} loading={busy}>
                Đổi mật khẩu
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Giữ tài khoản an toàn" icon={ShieldCheck}>
          <ul className="space-y-5">
            {TIPS.map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
                  <Icon className="size-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800">{title}</span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-slate-500">
                    {text}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
