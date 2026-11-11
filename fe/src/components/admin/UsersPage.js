"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Unlock,
  UserCog,
  Users,
  Wand2,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAdminList, useMutation } from "./hooks";
import { useConfirmClose } from "./catalogShared";
import {
  LEVELS,
  PERMISSION_GROUPS,
  PERMISSION_MODULES,
  PRESETS,
  emptyPermissions,
  grantedModules,
  levelLabel,
  normalizePermissions,
  useCurrentUser,
} from "./permissions";
import {
  Badge,
  BusyArea,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  Modal,
  Notice,
  PageHeader,
  Pagination,
  SearchBox,
  Select,
  Toggle,
  fmtDateTime,
  useUi,
} from "./ui";

const PATH = "/users";

/** Cột của bảng tài khoản (màn hình rộng) — dùng chung cho hàng tiêu đề và từng dòng */
const COLS = "lg:grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)_minmax(0,1fr)_15rem] lg:gap-x-5";

const ROLES = [
  { value: "admin", label: "Quản trị viên", hint: "Toàn quyền" },
  { value: "editor", label: "Nhân viên", hint: "Chỉ dùng các mục được cấp quyền" },
];

const MIN_PASSWORD = 8; // khớp be/src/validators/common.validator.js
const shortPassword = (pw) =>
  pw.length < MIN_PASSWORD ? `Mật khẩu cần ít nhất ${MIN_PASSWORD} ký tự` : "";

/** Mật khẩu ngẫu nhiên dễ đọc (bỏ ký tự dễ nhầm 0/O, 1/l) */
function randomPassword(len = 14) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => chars[n % chars.length]).join("");
}

export default function UsersPage() {
  const { confirm } = useUi();
  const list = useAdminList(PATH, { q: "", role: "", limit: 20 });
  const me = useCurrentUser();
  const [modal, setModal] = useState(null); // { type: "create" | "edit" | "password", user }
  const { run } = useMutation([]);

  const isMe = (u) => Boolean(me && (me.id === u.id || me.username === u.username));
  const replace = (doc) => list.setItems((xs) => xs.map((x) => (x.id === doc.id ? doc : x)));

  const unlock = async (u) => {
    const r = await run(
      () => api(`${PATH}/${u.id}/unlock`, { method: "POST" }),
      `Đã mở khoá tài khoản ${u.username}`,
    );
    if (r?.data) replace(r.data);
    else if (r) list.reload();
  };

  const remove = async (u) => {
    const ok = await confirm({
      title: "Xoá tài khoản?",
      message: `Tài khoản "${u.username}" (${u.name}) sẽ bị xoá và người này không đăng nhập được nữa.`,
      confirmText: "Xoá tài khoản",
      danger: true,
    });
    if (!ok) return;
    if (
      await run(
        () => api(`${PATH}/${u.id}`, { method: "DELETE" }),
        `Đã xoá tài khoản ${u.username}`,
      )
    )
      list.reload();
  };

  return (
    <>
      <PageHeader
        title="Tài khoản quản trị"
        description="Ai được đăng nhập trang quản trị và được dùng những mục nào. Quản trị viên có toàn quyền; nhân viên chỉ thấy các mục bạn cấp."
        actions={
          <Button icon={Plus} onClick={() => setModal({ type: "create" })}>
            Thêm tài khoản
          </Button>
        }
      />

      <Card bodyClassName="p-0">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4 sm:px-5">
          <SearchBox
            value={list.query.q}
            onChange={(q) => list.setQuery({ q })}
            placeholder="Tìm theo tên, tên đăng nhập, email…"
            className="min-w-56 flex-1"
          />
          <Select
            value={list.query.role}
            onChange={(e) => list.setQuery({ role: e.target.value })}
            className="w-full sm:w-56"
            aria-label="Lọc theo vai trò"
          >
            <option value="">Tất cả tài khoản</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>

        {list.error && (
          <Notice tone="error" className="m-4">
            {list.error}
          </Notice>
        )}
        {list.loading && !list.items.length ? (
          <LoadingBlock />
        ) : !list.items.length ? (
          <EmptyState icon={Users} title="Không có tài khoản phù hợp" />
        ) : (
          <BusyArea busy={list.loading}>
            <div
              className={cn(
                COLS,
                "hidden border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[11px] font-semibold tracking-wide text-slate-500 uppercase lg:grid",
              )}
            >
              <span className="text-center">Người dùng</span>
              <span className="text-center">Quyền</span>
              <span className="text-center">Đăng nhập lần cuối</span>
              <span className="text-center">Thao tác</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {list.items.map((u) => (
                <UserRow
                  key={u.id}
                  u={u}
                  isMe={isMe(u)}
                  onEdit={() => setModal({ type: "edit", user: u })}
                  onPassword={() => setModal({ type: "password", user: u })}
                  onUnlock={() => unlock(u)}
                  onRemove={() => remove(u)}
                />
              ))}
            </ul>
          </BusyArea>
        )}
        <Pagination meta={list.meta} onPage={(page) => list.setQuery({ page })} unit="tài khoản" />
      </Card>

      {modal?.type === "create" && (
        <CreateUser
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            list.reload();
          }}
        />
      )}
      {modal?.type === "edit" && (
        <EditUser
          user={modal.user}
          isMe={isMe(modal.user)}
          onClose={() => setModal(null)}
          onSaved={(doc) => {
            setModal(null);
            if (doc) replace(doc);
            else list.reload();
          }}
        />
      )}
      {modal?.type === "password" && (
        <ResetPassword user={modal.user} onClose={() => setModal(null)} />
      )}
    </>
  );
}

/* ---------- 1 dòng tài khoản ---------- */

function UserRow({ u, isMe, onEdit, onPassword, onUnlock, onRemove }) {
  const admin = u.role === "admin";
  return (
    <li
      className={cn(COLS, "flex flex-wrap items-center gap-x-3 gap-y-3 px-4 py-4 sm:px-5 lg:grid")}
    >
      <div className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-auto">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold uppercase",
            !u.isActive
              ? "bg-slate-100 text-slate-400"
              : admin
                ? "bg-violet-50 text-violet-700"
                : "bg-brand-50 text-brand-700",
          )}
        >
          {(u.name || u.username).slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-slate-900">
            <span className="truncate">{u.name || u.username}</span>
            {isMe && <Badge tone="blue">Bạn</Badge>}
            {!u.isActive && <Badge tone="red">Đã tắt đăng nhập</Badge>}
            {u.locked && (
              <span className="inline-flex items-center gap-1.5">
                <Badge tone="red">
                  <Lock className="size-3" /> Tạm khoá
                </Badge>
                {/* mở khoá ngay cạnh nhãn báo khoá → cột thao tác các dòng luôn thẳng hàng */}
                <button
                  type="button"
                  onClick={onUnlock}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-50"
                >
                  <Unlock className="size-3" /> Mở khoá
                </button>
              </span>
            )}
          </p>
          <p className="truncate text-xs text-slate-500">
            <span className="font-mono">{u.username}</span>
            {u.email && <span> · {u.email}</span>}
          </p>
        </div>
      </div>

      <div className="basis-full pl-[52px] lg:basis-auto lg:pl-0 lg:text-center">
        <AccessSummary user={u} onClick={admin ? undefined : onEdit} />
      </div>

      <p className="basis-full pl-[52px] text-xs text-slate-500 tabular-nums lg:basis-auto lg:pl-0 lg:text-center lg:text-[13px]">
        {u.lastLoginAt ? (
          <>
            <span className="lg:hidden">Đăng nhập lần cuối: </span>
            {fmtDateTime(u.lastLoginAt)}
          </>
        ) : (
          "Chưa đăng nhập lần nào"
        )}
      </p>

      <div className="flex w-full items-center justify-end gap-1 lg:w-auto lg:justify-center">
        <Button
          variant="soft"
          size="sm"
          icon={admin ? Pencil : ShieldCheck}
          onClick={onEdit}
          title={admin ? "Sửa tài khoản" : "Sửa tài khoản và quyền từng mục"}
          className="lg:w-32 lg:justify-center"
        >
          {admin ? "Sửa" : "Phân quyền"}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onPassword}
          aria-label="Đặt lại mật khẩu"
          title="Đặt lại mật khẩu"
        >
          <KeyRound className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={isMe}
          aria-label="Xoá"
          title={isMe ? "Bạn không thể tự xoá tài khoản của mình" : "Xoá"}
          className="text-sun-600"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  );
}

/** "Toàn quyền" cho quản trị viên; nhân viên: "Tour, Bài viết +3" (rê chuột / chạm để xem đủ) */
function AccessSummary({ user, onClick }) {
  if (user.role === "admin")
    return (
      <Badge tone="violet">
        <ShieldCheck className="size-3" /> Toàn quyền
      </Badge>
    );
  const granted = grantedModules(user.permissions);
  if (!granted.length)
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-xs text-slate-400 transition-colors hover:text-brand-700"
      >
        Nhân viên · chưa được cấp mục nào
      </button>
    );
  const shown = granted.slice(0, 2);
  const more = granted.length - shown.length;
  const full = granted.map((g) => `${g.label}: ${levelLabel(g.level)}`).join("\n");
  return (
    <button
      type="button"
      onClick={onClick}
      title={full}
      aria-label={`Quyền: ${full.replaceAll("\n", "; ")}`}
      className="inline-flex max-w-full flex-wrap items-center gap-1 text-left lg:justify-center"
    >
      <span className="text-[11px] font-semibold text-slate-400">Nhân viên ·</span>
      {shown.map((g) => (
        <Badge key={g.key} tone={g.level === "view" ? "gray" : "blue"}>
          {g.label}
        </Badge>
      ))}
      {more > 0 && <Badge tone="gray">+{more}</Badge>}
    </button>
  );
}

/* ---------- Ô nhập mật khẩu ---------- */

function PasswordInput({ value, onChange, autoFocus }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          maxLength={128}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          className="pr-11 font-mono"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <Button
        variant="secondary"
        icon={Wand2}
        onClick={() => {
          onChange(randomPassword());
          setShow(true);
        }}
        aria-label="Tạo mật khẩu ngẫu nhiên"
      >
        <span className="hidden sm:inline">Tạo ngẫu nhiên</span>
      </Button>
    </div>
  );
}

/* ---------- Vai trò ---------- */

function RolePicker({ value, onChange, disabled }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Vai trò">
      {ROLES.map((r) => {
        const on = value === r.value;
        const Icon = r.value === "admin" ? ShieldCheck : UserCog;
        return (
          <label
            key={r.value}
            className={cn(
              "flex items-center gap-3 rounded-xl p-3 ring-1 transition",
              disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
              on ? "bg-brand-50 ring-2 ring-brand-400" : "ring-slate-200 hover:ring-brand-200",
            )}
          >
            <input
              type="radio"
              name="role"
              value={r.value}
              checked={on}
              disabled={disabled}
              onChange={() => onChange(r.value)}
              className="sr-only"
            />
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-lg",
                on ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500",
              )}
            >
              <Icon className="size-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-800">{r.label}</span>
              <span className="block text-xs text-slate-500">{r.hint}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

/* ---------- Bảng phân quyền ---------- */

const LEVEL_ON = {
  none: "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200",
  view: "bg-white text-brand-700 shadow-sm ring-1 ring-brand-200",
  edit: "bg-brand-600 text-white shadow-sm",
  full: "bg-emerald-600 text-white shadow-sm",
};

const levelText = (m, level) =>
  level === "none"
    ? "Không thấy mục này"
    : level === "view"
      ? "Chỉ xem, không thay đổi được"
      : level === "edit"
        ? m.edit
        : m.full;

function PermissionMatrix({ value, onChange, disabled }) {
  const set = (key, level) => onChange({ ...value, [key]: level });
  const granted = PERMISSION_MODULES.filter((m) => value[m.key] !== "none").length;
  const same = (p) => PERMISSION_MODULES.every((m) => p[m.key] === value[m.key]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold text-slate-500">Chọn nhanh:</span>
        {PRESETS.map((p) => {
          const on = same(p.value());
          return (
            <button
              key={p.key}
              type="button"
              disabled={disabled}
              title={p.hint}
              onClick={() => onChange(p.value())}
              className={cn(
                "h-8 rounded-full px-3.5 text-xs font-semibold ring-1 transition disabled:opacity-50",
                on
                  ? "bg-brand-700 text-white ring-brand-700"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-brand-50 hover:ring-brand-200",
              )}
            >
              {p.label}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-slate-500 tabular-nums">
          Đã cấp <b className="text-slate-800">{granted}</b>/{PERMISSION_MODULES.length} mục
        </span>
      </div>

      <p className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-600">
        <b>Xem</b>: chỉ xem. <b>Sửa</b>: thêm mới, sửa, ẩn/hiện, sắp xếp (với đơn: đổi trạng thái,
        ghi chú). <b>Toàn quyền</b>: như Sửa, thêm quyền xoá. Cài đặt và Tài khoản quản trị luôn chỉ
        dành cho quản trị viên.
      </p>

      {PERMISSION_GROUPS.map((g) => (
        <section key={g.group}>
          <h4 className="mb-1.5 px-1 text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
            {g.group}
          </h4>
          <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
            {g.items.map((m) => {
              const level = value[m.key] ?? "none";
              return (
                <li
                  key={m.key}
                  className="grid items-center gap-x-4 gap-y-2 px-3.5 py-3 sm:grid-cols-[minmax(0,1fr)_21rem]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{m.label}</p>
                    <p className="text-xs text-slate-500">
                      {m.hint}
                      <span className="text-slate-300"> · </span>
                      <span
                        className={cn(
                          level === "none" ? "text-slate-400" : "font-medium text-brand-700",
                        )}
                      >
                        {levelText(m, level)}
                      </span>
                    </p>
                  </div>
                  <div
                    role="radiogroup"
                    aria-label={`Quyền mục ${m.label}`}
                    className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1"
                  >
                    {LEVELS.filter((l) => m.levels.includes(l.value)).map((l) => (
                      <button
                        key={l.value}
                        type="button"
                        role="radio"
                        aria-checked={level === l.value}
                        disabled={disabled}
                        onClick={() => set(m.key, l.value)}
                        title={l.long}
                        className={cn(
                          "h-8 rounded-lg px-1 text-xs font-semibold whitespace-nowrap transition disabled:cursor-not-allowed",
                          level === l.value
                            ? LEVEL_ON[l.value]
                            : "text-slate-500 hover:bg-white/70 hover:text-slate-800",
                        )}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ---------- Thêm tài khoản ---------- */

function CreateUser({ onClose, onSaved }) {
  const [d, setD] = useState({
    username: "",
    email: "",
    name: "",
    password: "",
    role: "editor",
    permissions: emptyPermissions(), // an toàn: chưa cấp gì, admin tự chọn (hoặc bấm 1 mẫu)
  });
  const { run, busy } = useMutation([]);
  const { toast } = useUi();
  const close = useConfirmClose(d, onClose);
  const set = (patch) => setD((x) => ({ ...x, ...patch }));

  const save = async () => {
    if (d.name.trim().length < 2) return toast("Vui lòng nhập họ tên", "error");
    if (!/^[a-z0-9._@-]{3,64}$/.test(d.username))
      return toast("Tên đăng nhập cần 3–64 ký tự, viết liền không dấu (vd: lan.nguyen)", "error");
    if (!d.password) return toast("Vui lòng nhập mật khẩu", "error");
    if (shortPassword(d.password)) return toast(shortPassword(d.password), "error");
    if (d.role === "editor" && !grantedModules(d.permissions).length)
      return toast(
        "Hãy cấp ít nhất 1 mục cho nhân viên — hoặc bấm một mẫu ở phần Chọn nhanh.",
        "error",
      );
    const body = { ...d, name: d.name.trim(), email: d.email.trim().toLowerCase() };
    if (d.role === "admin") delete body.permissions;
    if (await run(() => api(PATH, { method: "POST", body }), `Đã tạo tài khoản ${d.username}`))
      onSaved();
  };

  return (
    <Modal
      open
      size="xl"
      onClose={close}
      title="Thêm tài khoản"
      icon={UserCog}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Huỷ
          </Button>
          <Button onClick={save} loading={busy}>
            Tạo tài khoản
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Họ tên" required>
            <Input value={d.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
          </Field>
          <Field
            label="Tên đăng nhập"
            required
            hint="Viết liền không dấu, vd: lan.nguyen. Không đổi được sau khi tạo."
          >
            <Input
              value={d.username}
              autoComplete="off"
              onChange={(e) => set({ username: e.target.value.trim().toLowerCase() })}
              className="font-mono"
            />
          </Field>
          <Field label="Email" hint="Không bắt buộc">
            <Input type="email" value={d.email} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field
            label="Mật khẩu"
            required
            hint={`Ít nhất ${MIN_PASSWORD} ký tự. Hãy gửi riêng mật khẩu này cho người dùng.`}
          >
            <PasswordInput value={d.password} onChange={(password) => set({ password })} />
          </Field>
        </div>
        <Field label="Vai trò" required>
          <RolePicker value={d.role} onChange={(role) => set({ role })} />
        </Field>
        {d.role === "editor" && (
          <Field label="Quyền từng mục" required>
            <PermissionMatrix
              value={d.permissions}
              onChange={(permissions) => set({ permissions })}
            />
          </Field>
        )}
      </div>
    </Modal>
  );
}

/* ---------- Sửa tài khoản + phân quyền ---------- */

function EditUser({ user, isMe, onClose, onSaved }) {
  const startPerms =
    user.role === "admin" ? emptyPermissions() : normalizePermissions(user.permissions);
  const [d, setD] = useState({
    name: user.name ?? "",
    role: user.role,
    isActive: user.isActive,
    permissions: startPerms,
  });
  const { run, busy } = useMutation([]);
  const { toast } = useUi();
  const close = useConfirmClose(d, onClose);
  const set = (patch) => setD((x) => ({ ...x, ...patch }));

  const save = async () => {
    const body = {};
    if (d.name.trim() !== (user.name ?? "")) body.name = d.name.trim();
    if (d.role !== user.role) body.role = d.role;
    if (d.isActive !== user.isActive) body.isActive = d.isActive;
    const permsChanged = PERMISSION_MODULES.some((m) => d.permissions[m.key] !== startPerms[m.key]);
    if (d.role === "editor" && (permsChanged || body.role)) body.permissions = d.permissions;
    if (!Object.keys(body).length) return onClose();
    if (body.name !== undefined && body.name.length < 2)
      return toast("Vui lòng nhập họ tên", "error");
    const r = await run(
      () => api(`${PATH}/${user.id}`, { method: "PATCH", body }),
      body.isActive === false
        ? `Đã tắt đăng nhập của ${user.username}`
        : body.permissions && !body.role
          ? `Đã lưu quyền của ${user.username} — có hiệu lực ngay`
          : `Đã lưu tài khoản ${user.username}`,
    );
    if (r) onSaved(r.data);
  };

  return (
    <Modal
      open
      size={d.role === "editor" ? "xl" : "md"}
      onClose={close}
      title={`${d.role === "editor" ? "Phân quyền" : "Sửa tài khoản"}: ${user.name || user.username}`}
      icon={d.role === "editor" ? ShieldCheck : Pencil}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Huỷ
          </Button>
          <Button onClick={save} loading={busy}>
            Lưu
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className={cn("grid gap-4", d.role === "editor" && "sm:grid-cols-2")}>
          <Field label="Họ tên" required>
            <Input value={d.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <div className="sm:pt-7">
            <Toggle
              checked={d.isActive}
              onChange={(isActive) => set({ isActive })}
              disabled={isMe}
              label="Cho phép đăng nhập"
              hint={
                isMe
                  ? "Bạn không thể tự tắt đăng nhập của mình."
                  : "Tắt thì người này không đăng nhập được nữa, tài khoản vẫn được giữ."
              }
            />
          </div>
        </div>
        <Field
          label="Vai trò"
          required
          hint={
            isMe
              ? "Bạn không thể tự đổi vai trò của mình."
              : "Khi đổi vai trò, người này sẽ cần đăng nhập lại."
          }
        >
          <RolePicker value={d.role} onChange={(role) => set({ role })} disabled={isMe} />
        </Field>
        {d.role === "editor" && (
          <Field
            label="Quyền từng mục"
            hint="Thay đổi có hiệu lực ngay ở lần bấm tiếp theo của người này — không cần đăng nhập lại."
          >
            <PermissionMatrix
              value={d.permissions}
              onChange={(permissions) => set({ permissions })}
              disabled={isMe}
            />
          </Field>
        )}
      </div>
    </Modal>
  );
}

/* ---------- Đặt lại mật khẩu ---------- */

function ResetPassword({ user, onClose }) {
  const [pw, setPw] = useState("");
  const { run, busy } = useMutation([]);
  const { toast } = useUi();
  const close = useConfirmClose(pw, onClose);

  const save = async () => {
    if (!pw) return toast("Vui lòng nhập mật khẩu mới", "error");
    if (shortPassword(pw)) return toast(shortPassword(pw), "error");
    const r = await run(
      () => api(`${PATH}/${user.id}/reset-password`, { method: "POST", body: { newPassword: pw } }),
      `Đã đặt lại mật khẩu cho ${user.username}`,
    );
    if (r) onClose();
  };

  return (
    <Modal
      open
      onClose={close}
      title={`Đặt lại mật khẩu: ${user.username}`}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Huỷ
          </Button>
          <Button onClick={save} loading={busy}>
            Đặt lại mật khẩu
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Notice tone="warn">
          Người này sẽ bị đăng xuất và phải đăng nhập bằng mật khẩu mới. Hãy gửi riêng mật khẩu mới
          cho họ.
        </Notice>
        <Field label="Mật khẩu mới" required hint={`Ít nhất ${MIN_PASSWORD} ký tự.`}>
          <PasswordInput value={pw} onChange={setPw} autoFocus />
        </Field>
      </div>
    </Modal>
  );
}
