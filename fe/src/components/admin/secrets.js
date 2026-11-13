"use client";

import { useCallback, useId, useState } from "react";
import { Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button, Field, Input, Modal, fmtDateTime } from "./ui";

/**
 * Ô nhập khoá bí mật trong Cài đặt (mã 9Pay, khoá API Tripadvisor / Google) + hộp "Nhập mật khẩu để xác nhận".
 * An toàn:
 * - Khoá chỉ đi 1 chiều trình duyệt → máy chủ (lưu mã hoá); máy chủ chỉ trả ••••abcd.
 * - Ô nhập dạng mật khẩu, tắt tự sửa / tự viết hoa / kiểm tra chính tả, trình quản lý mật khẩu bỏ qua ô này.
 * - Khoá chỉ nằm trong state của form (không URL, không localStorage, không thông báo, không console) và bị xoá
 *   ngay sau khi lưu xong (form nạp lại từ máy chủ).
 * - Đổi / xoá khoá: máy chủ bắt nhập lại mật khẩu của chính admin (useReauth).
 */

/** Quy tắc dạng khoá (khớp kiểm tra ở máy chủ — be/src/validators/content.validator.js) */
export const SECRET_RULES = {
  apiKey: {
    rx: /^[A-Za-z0-9_-]+$/,
    min: 16,
    max: 300,
    charset: "chỉ gồm chữ không dấu, số, dấu gạch ngang (-) và gạch dưới (_)",
  },
  ninePay: {
    rx: /^[\x21-\x7E]+$/,
    min: 8,
    max: 500,
    charset: "không được có dấu cách hay chữ có dấu",
  },
};

/** Lỗi dạng khoá (câu dễ hiểu) — "" = dùng được / chưa nhập */
export function secretError(value, rule) {
  if (!value) return "";
  if (!rule.rx.test(value)) return `Khoá ${rule.charset}. Kiểm tra lại đã dán đúng chưa.`;
  if (value.length < rule.min)
    return `Khoá quá ngắn (cần ít nhất ${rule.min} ký tự) — có thể chưa dán đủ.`;
  if (value.length > rule.max) return "Khoá quá dài — kiểm tra lại đã dán đúng khoá chưa.";
  return "";
}

/** Thuộc tính chung cho ô nhập bí mật: không gợi ý, không tự sửa, trình quản lý mật khẩu không lưu */
const SECRET_INPUT_PROPS = {
  autoComplete: "new-password",
  spellCheck: false,
  autoCorrect: "off",
  autoCapitalize: "off",
  "data-1p-ignore": "true",
  "data-lpignore": "true",
  "data-bwignore": "true",
  "data-form-type": "other",
};

/** "••••••abcd" → "••••abcd" (gọn, đủ nhận ra khoá nào) */
const shortMask = (m) => (m ? `••••${m.replace(/^•+/, "")}` : "••••");

/** "Đã lưu an toàn (mã hoá) · cập nhật lúc … bởi …" */
export function savedNote(info) {
  const parts = ["Đã lưu an toàn (mã hoá)"];
  if (info?.at)
    parts.push(`cập nhật lúc ${fmtDateTime(info.at)}${info.by ? ` bởi ${info.by}` : ""}`);
  return parts.join(" · ");
}

const KEY_BTN =
  "h-8 shrink-0 rounded-lg px-2 text-xs font-semibold whitespace-nowrap text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none";

/** Ô mật khẩu có nút hiện / ẩn */
function MaskedInput({ value, onChange, placeholder, invalid, disabled, inputProps, ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative min-w-0 flex-1">
      <Input
        type={show ? "text" : "password"}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={onChange}
        className="pr-11 font-mono"
        {...inputProps}
        {...rest}
      />
      {!disabled && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Ẩn" : "Hiện"}
          aria-pressed={show}
          title={show ? "Ẩn" : "Hiện"}
          className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      )}
    </div>
  );
}

/**
 * Ô khoá bí mật — 3 trạng thái:
 * - "view": đã lưu → hiện ••••abcd + Đổi khoá / Xoá khoá, dòng "Đã lưu an toàn (mã hoá) · cập nhật lúc … bởi …"
 * - "edit": nhập khoá mới (dạng mật khẩu, nút hiện / ẩn)
 * - "clear": khoá sẽ bị xoá khi bấm Lưu
 * @param {{ label: string, hint?: string, configured: boolean, masked?: string, info?: { at?: string, by?: string },
 *   value: string, onChange: (v: string) => void, mode: "view" | "edit" | "clear", onMode: (m: string) => void,
 *   rule: object, allowClear?: boolean, placeholder?: string }} props
 */
export function SecretKeyField({
  label,
  hint,
  configured,
  masked,
  info,
  value,
  onChange,
  mode,
  onMode,
  rule,
  allowClear = true,
  onRequestClear,
  placeholder = "Dán khoá vào đây",
}) {
  const id = useId();
  const error = mode === "edit" ? secretError(value, rule) : "";
  const showSaved = configured && mode === "view";
  const cancel = configured && mode !== "view" && (
    <Button variant="secondary" onClick={() => onMode("view")}>
      Huỷ
    </Button>
  );

  return (
    <Field
      label={label}
      htmlFor={showSaved ? undefined : id}
      error={error}
      hint={
        showSaved ? (
          <span className="flex items-start gap-1.5">
            <ShieldCheck className="mt-px size-3.5 shrink-0 text-emerald-600" />
            <span className="min-w-0">{savedNote(info)}</span>
          </span>
        ) : mode === "clear" ? (
          "Khoá đang lưu sẽ bị xoá khi bấm Lưu."
        ) : configured ? (
          "Nhập khoá mới để thay khoá đang dùng. Bấm Huỷ để giữ khoá cũ."
        ) : (
          hint
        )
      }
    >
      {showSaved ? (
        <div className="flex h-[46px] min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white pr-1.5 pl-3.5">
          <KeyRound className="size-4 shrink-0 text-slate-400 max-sm:hidden" />
          <span className="min-w-0 flex-1 truncate font-mono text-sm text-slate-700">
            {shortMask(masked)}
          </span>
          <button
            type="button"
            className={KEY_BTN}
            onClick={() => {
              onChange("");
              onMode("edit");
            }}
          >
            Đổi khoá
          </button>
          {allowClear && (
            <button
              type="button"
              className={cn(KEY_BTN, "text-sun-600 hover:bg-sun-50 hover:text-sun-700")}
              onClick={async () => {
                if (onRequestClear && !(await onRequestClear())) return;
                onChange("");
                onMode("clear");
              }}
            >
              Xoá khoá
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <MaskedInput
            id={id}
            value={mode === "clear" ? "" : value}
            disabled={mode === "clear"}
            invalid={!!error}
            placeholder={mode === "clear" ? "Khoá sẽ bị xoá khi bấm Lưu" : placeholder}
            maxLength={rule.max + 50}
            // bỏ mọi khoảng trắng (hay dính khi chép từ email / trang quản lý)
            onChange={(e) => onChange(e.target.value.replace(/\s+/g, ""))}
            inputProps={SECRET_INPUT_PROPS}
          />
          {cancel}
        </div>
      )}
    </Field>
  );
}

const OP_LABEL = { replace: "Thay", clear: "Xoá" };

/**
 * Xác nhận mật khẩu trước khi đổi / xoá khoá (máy chủ kiểm tra lại — sai được tính như đăng nhập sai).
 *   const reauth = useReauth();
 *   await run(() => reauth.run((confirmPassword) => api(PATH, { method: "PUT", body: { ...b, confirmPassword } }), changes));
 *   …{reauth.dialog}
 * `changes`: [{ label, op: "replace" | "clear" }] — rỗng → gửi thẳng (máy chủ vẫn đòi mật khẩu nếu thấy có đổi khoá).
 * Huỷ → lỗi AbortError (useMutation bỏ qua, không báo lỗi). Sai mật khẩu → báo ngay trong hộp, nhập lại được.
 */
export function useReauth() {
  const [req, setReq] = useState(null); // { send, resolve, reject, changes }
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const formId = useId();
  const pwId = useId();

  const finish = useCallback(() => {
    setReq(null);
    setPassword(""); // không giữ mật khẩu trong bộ nhớ sau khi xong
    setError("");
    setBusy(false);
  }, []);

  const ask = useCallback(
    (send, changes) =>
      new Promise((resolve, reject) => {
        setPassword("");
        setError("");
        setReq({ send, resolve, reject, changes });
      }),
    [],
  );

  const run = useCallback(
    async (send, changes = []) => {
      if (!changes.length) {
        try {
          return await send("");
        } catch (err) {
          if (err?.code !== "REAUTH_REQUIRED") throw err;
        }
      }
      return ask(send, changes);
    },
    [ask],
  );

  const cancel = () => {
    if (busy) return;
    req?.reject(new DOMException("Đã huỷ", "AbortError"));
    finish();
  };

  const submit = async (e) => {
    e.preventDefault();
    const r = req;
    if (!r || busy) return;
    if (!password) return setError("Vui lòng nhập mật khẩu");
    setBusy(true);
    setError("");
    try {
      const result = await r.send(password);
      finish();
      r.resolve(result);
    } catch (err) {
      if (err?.code === "REAUTH_FAILED" || err?.code === "REAUTH_REQUIRED") {
        setPassword("");
        setError(errorMessage(err));
        setBusy(false);
      } else {
        finish();
        r.reject(err); // lỗi khác (bị tạm khoá, mất mạng…) → nơi gọi báo như thường
      }
    }
  };

  const changes = req?.changes ?? [];
  const dialog = (
    <Modal
      open={!!req}
      onClose={cancel}
      size="sm"
      icon={LockKeyhole}
      title="Xác nhận đổi khoá bảo mật"
      description="Nhập mật khẩu của bạn để xác nhận."
      footer={
        <>
          <Button variant="secondary" onClick={cancel} disabled={busy}>
            Huỷ
          </Button>
          <Button type="submit" form={formId} loading={busy} icon={ShieldCheck}>
            Xác nhận và lưu
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-4">
        {changes.length > 0 && (
          <ul className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-[13px] text-slate-700 ring-1 ring-slate-200/80">
            {changes.map((c) => (
              <li key={`${c.op}:${c.label}`} className="flex items-start gap-2">
                <KeyRound
                  className={cn(
                    "mt-0.5 size-3.5 shrink-0",
                    c.op === "clear" ? "text-sun-600" : "text-brand-600",
                  )}
                />
                <span className="min-w-0">
                  <b className="font-semibold">{OP_LABEL[c.op] ?? "Đổi"}</b> {c.label}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Field
          label="Mật khẩu đăng nhập của bạn"
          htmlFor={pwId}
          error={error}
          hint="Nhập sai nhiều lần, tài khoản sẽ bị tạm khoá như khi đăng nhập sai."
        >
          <MaskedInput
            id={pwId}
            value={password}
            invalid={!!error}
            autoComplete="current-password"
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
          />
        </Field>
      </form>
    </Modal>
  );

  return { run, dialog };
}
