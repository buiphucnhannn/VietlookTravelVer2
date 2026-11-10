"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Unlock,
  Users,
  Wand2,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAdminList, useMutation } from "./hooks";
import {
  Badge,
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
const COLS =
  "lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.3fr)_14rem] lg:gap-x-4";

const ROLES = [
  {
    value: "admin",
    label: "Quản trị viên",
    hint: "Toàn quyền, gồm cả Cài đặt và Tài khoản.",
  },
  {
    value: "editor",
    label: "Biên tập viên",
    hint: "Quản lý tour, bài viết, đơn — không vào Cài đặt và Tài khoản.",
  },
];
const roleLabel = (r) => ROLES.find((x) => x.value === r)?.label ?? r;

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
  const [me, setMe] = useState(null);
  const [modal, setModal] = useState(null); // { type: "create" | "edit" | "password", user }
  const { run } = useMutation([]);

  useEffect(() => {
    api("/auth/me")
      .then((r) => setMe(r.data?.user ?? r.data ?? null))
      .catch(() => {});
  }, []);

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
    if (await run(() => api(`${PATH}/${u.id}`, { method: "DELETE" }), "Đã xoá tài khoản"))
      list.reload();
  };

  return (
    <>
      <PageHeader
        title="Tài khoản quản trị"
        description="Những người được đăng nhập trang quản trị. Quản trị viên có toàn quyền; Biên tập viên quản lý tour, bài viết và đơn."
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
          >
            <option value="">Tất cả vai trò</option>
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
          <>
            <div
              className={cn(
                COLS,
                "hidden border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[11px] font-semibold tracking-wide text-slate-500 uppercase lg:grid",
              )}
            >
              <span>Người dùng</span>
              <span className="text-center">Tên đăng nhập</span>
              <span className="text-center">Vai trò</span>
              <span className="text-center">Đăng nhập lần cuối</span>
              <span className="text-center">Thao tác</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {list.items.map((u) => {
                const isMe = me && (me.id === u.id || me.username === u.username);
                return (
                  <li
                    key={u.id}
                    className={cn(
                      COLS,
                      "flex flex-wrap items-center gap-y-2 px-4 py-3.5 sm:px-5 lg:grid",
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold uppercase",
                          u.isActive ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-400",
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
                            <Badge tone="red">
                              <Lock className="size-3" /> Tạm khoá
                            </Badge>
                          )}
                        </p>
                        {u.email && <p className="truncate text-xs text-slate-500">{u.email}</p>}
                      </div>
                    </div>
                    <div className="order-last flex basis-full flex-wrap items-center gap-x-3 gap-y-1 pl-[52px] text-xs text-slate-500 lg:order-none lg:contents lg:text-[13px]">
                      <span className="truncate font-mono text-slate-600 lg:text-center">
                        {u.username}
                      </span>
                      <span className="lg:text-center">
                        <Badge tone={u.role === "admin" ? "violet" : "gray"}>
                          {roleLabel(u.role)}
                        </Badge>
                      </span>
                      <span className="tabular-nums lg:text-center">
                        {u.lastLoginAt ? (
                          <>
                            <span className="lg:hidden">Đăng nhập lần cuối: </span>
                            {fmtDateTime(u.lastLoginAt)}
                          </>
                        ) : (
                          "Chưa đăng nhập lần nào"
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-1 lg:justify-center">
                      {u.locked && (
                        <Button variant="soft" size="sm" icon={Unlock} onClick={() => unlock(u)}>
                          Mở khoá
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setModal({ type: "edit", user: u })}
                        aria-label="Sửa"
                        title="Sửa"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setModal({ type: "password", user: u })}
                        aria-label="Đặt lại mật khẩu"
                        title="Đặt lại mật khẩu"
                      >
                        <KeyRound className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(u)}
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
              })}
            </ul>
          </>
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
          isMe={me && (me.id === modal.user.id || me.username === modal.user.username)}
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
      >
        Tạo ngẫu nhiên
      </Button>
    </div>
  );
}

function RolePicker({ value, onChange, disabled }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ROLES.map((r) => (
        <label
          key={r.value}
          className={`rounded-xl p-3 ring-1 transition ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${
            value === r.value ? "bg-brand-50 ring-brand-300" : "ring-slate-200 hover:ring-brand-200"
          }`}
        >
          <input
            type="radio"
            name="role"
            value={r.value}
            checked={value === r.value}
            disabled={disabled}
            onChange={() => onChange(r.value)}
            className="sr-only"
          />
          <span className="block text-sm font-semibold text-slate-800">{r.label}</span>
          <span className="block text-xs text-slate-500">{r.hint}</span>
        </label>
      ))}
    </div>
  );
}

function CreateUser({ onClose, onSaved }) {
  const [d, setD] = useState({ username: "", email: "", name: "", password: "", role: "editor" });
  const { run, busy } = useMutation([]);
  const { toast } = useUi();
  const set = (patch) => setD((x) => ({ ...x, ...patch }));

  const save = async () => {
    if (!/^[a-z0-9._@-]{3,64}$/.test(d.username))
      return toast("Tên đăng nhập cần 3–64 ký tự, viết liền không dấu (vd: lan.nguyen)", "error");
    if (d.name.trim().length < 2) return toast("Vui lòng nhập họ tên", "error");
    if (!d.password) return toast("Vui lòng nhập mật khẩu", "error");
    const body = { ...d, name: d.name.trim(), email: d.email.trim().toLowerCase() };
    if (await run(() => api(PATH, { method: "POST", body }), `Đã tạo tài khoản ${d.username}`))
      onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Thêm tài khoản"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={save} loading={busy}>
            Tạo tài khoản
          </Button>
        </>
      }
    >
      <div className="space-y-4">
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
        <Field label="Mật khẩu" required hint="Hãy gửi riêng mật khẩu này cho người dùng.">
          <PasswordInput value={d.password} onChange={(password) => set({ password })} />
        </Field>
        <Field label="Vai trò" required>
          <RolePicker value={d.role} onChange={(role) => set({ role })} />
        </Field>
      </div>
    </Modal>
  );
}

function EditUser({ user, isMe, onClose, onSaved }) {
  const [d, setD] = useState({ name: user.name ?? "", role: user.role, isActive: user.isActive });
  const { run, busy } = useMutation([]);
  const { toast } = useUi();
  const set = (patch) => setD((x) => ({ ...x, ...patch }));

  const save = async () => {
    const body = {};
    if (d.name.trim() !== (user.name ?? "")) body.name = d.name.trim();
    if (d.role !== user.role) body.role = d.role;
    if (d.isActive !== user.isActive) body.isActive = d.isActive;
    if (!Object.keys(body).length) return onClose();
    if (body.name !== undefined && body.name.length < 2)
      return toast("Vui lòng nhập họ tên", "error");
    const r = await run(
      () => api(`${PATH}/${user.id}`, { method: "PATCH", body }),
      "Đã lưu tài khoản",
    );
    if (r) onSaved(r.data);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Sửa tài khoản: ${user.username}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={save} loading={busy}>
            Lưu
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Họ tên" required>
          <Input value={d.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
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
    </Modal>
  );
}

function ResetPassword({ user, onClose }) {
  const [pw, setPw] = useState("");
  const { run, busy } = useMutation([]);
  const { toast } = useUi();

  const save = async () => {
    if (!pw) return toast("Vui lòng nhập mật khẩu mới", "error");
    const r = await run(
      () => api(`${PATH}/${user.id}/reset-password`, { method: "POST", body: { newPassword: pw } }),
      `Đã đặt lại mật khẩu cho ${user.username}`,
    );
    if (r) onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Đặt lại mật khẩu: ${user.username}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
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
        <Field label="Mật khẩu mới" required>
          <PasswordInput value={pw} onChange={setPw} autoFocus />
        </Field>
      </div>
    </Modal>
  );
}
