"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CalendarCheck,
  Copy,
  Globe,
  Inbox,
  Mail,
  MailWarning,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
  StickyNote,
  Trash2,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { priceLineVi } from "@/lib/pricing-labels";
import { toastError, useAdminList, useMutation } from "./hooks";
import { TODO_EVENT } from "./AdminShell";
import { usePermission } from "./permissions";
import {
  Badge,
  BusyArea,
  Button,
  Card,
  EmptyState,
  LoadingBlock,
  Modal,
  Notice,
  PageHeader,
  Pagination,
  SearchBox,
  Select,
  Textarea,
  Toggle,
  fmtDateTime,
  fmtUSD,
  useUi,
} from "./ui";

const PATH = "/enquiries";
const MAIL_OFF_TEXT =
  "Tính năng gửi email chưa được bật. Liên hệ đơn vị phát triển website để bật.";

/* =========================================================================
 * Nhãn dùng chung (Dashboard cũng dùng)
 * ========================================================================= */

export const STATUSES = [
  { value: "new", label: "Mới", tone: "red" },
  { value: "contacted", label: "Đã liên hệ", tone: "amber" },
  { value: "confirmed", label: "Đã xác nhận", tone: "blue" },
  { value: "completed", label: "Hoàn tất", tone: "green" },
  { value: "cancelled", label: "Hủy", tone: "gray" },
];
const statusOf = (v) => STATUSES.find((s) => s.value === v) ?? { label: v, tone: "gray" };

export const ENQUIRY_TYPES = [
  { value: "booking", label: "Đặt tour", tone: "blue" },
  { value: "planner", label: "Thiết kế tour", tone: "violet" },
  { value: "car", label: "Báo giá xe", tone: "amber" },
  { value: "visa", label: "Visa & fast-track", tone: "green" },
  { value: "contact", label: "Liên hệ", tone: "gray" },
  { value: "partner", label: "Đối tác B2B", tone: "red" },
];
const typeOf = (v) => ENQUIRY_TYPES.find((t) => t.value === v) ?? { label: v, tone: "gray" };
const REQUEST_TYPES = ENQUIRY_TYPES.filter((t) => t.value !== "booking");

export function StatusBadge({ status }) {
  const s = statusOf(status);
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function TypeBadge({ type }) {
  const t = typeOf(type);
  return <Badge tone={t.tone}>{t.label}</Badge>;
}

function PaymentBadge({ value }) {
  return value === "paid" ? (
    <Badge tone="green">Đã thanh toán</Badge>
  ) : (
    <Badge tone="gray">Chưa thanh toán</Badge>
  );
}

/** "2026-05-12" → "12/05/2026" (không đổi múi giờ) */
export const fmtDay = (s) => {
  if (!s) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(s);
};

export const fmtMoney = (estimate) => {
  if (estimate?.total == null) return "—";
  const cur = estimate.currency || "USD";
  return cur === "USD"
    ? fmtUSD(estimate.total)
    : `${Number(estimate.total).toLocaleString("vi-VN")} ${cur}`;
};
const fmtAmount = (n, cur = "USD") =>
  n == null ? "—" : cur === "USD" ? fmtUSD(n) : `${Number(n).toLocaleString("vi-VN")} ${cur}`;

export const paxText = (e) => {
  const kids = e.childAges?.length ?? 0;
  const parts = [];
  if (e.adults) parts.push(`${e.adults} người lớn`);
  if (kids) parts.push(`${kids} trẻ em`);
  return parts.join(" · ");
};

export const emailFailed = (e) =>
  e.emailStatus?.customer === "failed" || e.emailStatus?.company === "failed";

const LANG_LABEL = { en: "Tiếng Anh", zh: "Tiếng Trung", vi: "Tiếng Việt" };

const EMAIL_STATE = {
  sent: { label: "Đã gửi", tone: "green" },
  failed: { label: "Chưa gửi được", tone: "red" },
  pending: { label: "Đang chờ", tone: "amber" },
  skipped: { label: "Không gửi", tone: "gray" },
};

/** Tên tiếng Việt cho các trường riêng của từng form (không có → hiện tên gốc) */
const DETAIL_LABELS = {
  date: "Ngày đi",
  returnDate: "Ngày về",
  time: "Giờ đón",
  pickupTime: "Giờ đón",
  pickup: "Điểm đón",
  dropoff: "Điểm trả",
  route: "Lộ trình",
  tripType: "Loại chuyến",
  vehicle: "Loại xe",
  passengers: "Số khách",
  luggage: "Hành lý",
  airport: "Sân bay",
  flight: "Chuyến bay",
  arrival: "Ngày đến",
  arrivalDate: "Ngày đến",
  departure: "Ngày khởi hành",
  entryDate: "Ngày nhập cảnh",
  exitDate: "Ngày xuất cảnh",
  service: "Dịch vụ",
  visaType: "Loại visa",
  entries: "Số lần nhập cảnh",
  processing: "Thời gian xử lý",
  purpose: "Mục đích",
  quantity: "Số lượng",
  budget: "Ngân sách",
  hotel: "Khách sạn",
  accommodation: "Lưu trú",
  destinations: "Điểm đến",
  duration: "Thời lượng",
  days: "Số ngày",
  nights: "Số đêm",
  adults: "Người lớn",
  children: "Trẻ em",
  travelers: "Số khách",
  travelStyle: "Phong cách du lịch",
  interests: "Sở thích",
  pace: "Nhịp độ",
  region: "Khu vực",
  country: "Quốc gia",
  subject: "Chủ đề",
  company: "Công ty",
  position: "Chức vụ",
  website: "Website",
  market: "Thị trường",
  volume: "Lượng khách dự kiến",
  summary: "Tóm tắt",
  source: "Biết đến qua",
  level: "Gói dịch vụ",
  travellers: "Số khách",
  flexible: "Ngày đi linh hoạt",
  requests: "Yêu cầu riêng",
  contactVia: "Muốn liên hệ qua",
  payment: "Hình thức thanh toán",
  from: "Điểm đi",
  to: "Điểm đến",
  returnTime: "Giờ về",
  routeSlug: "Tuyến",
  priceUSD: "Giá báo (USD)",
};

/** Giá trị dạng mã của form → chữ dễ hiểu */
const DETAIL_VALUES = {
  oneWay: "Một chiều",
  roundTrip: "Khứ hồi",
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  card: "Thẻ",
  none: "Không",
  "on request": "Liên hệ báo giá",
};
const detailLabel = (k) =>
  DETAIL_LABELS[k] ??
  k
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());

const detailValue = (v) => {
  if (v == null || v === "") return "";
  if (Array.isArray(v)) return v.map(detailValue).filter(Boolean).join(", ");
  if (typeof v === "boolean") return v ? "Có" : "Không";
  if (typeof v === "object") return Object.values(v).map(detailValue).filter(Boolean).join(" · ");
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return fmtDay(s);
  return DETAIL_VALUES[s] ?? s;
};

/** Số điện thoại → số dùng cho WhatsApp (số VN bắt đầu bằng 0 → thêm mã 84) */
const waNumber = (phone) => {
  const d = String(phone).replace(/\D/g, "").replace(/^00/, "");
  return /^0\d{8,10}$/.test(d) ? `84${d.slice(1)}` : d;
};

/* =========================================================================
 * Trang danh sách
 * ========================================================================= */

export default function EnquiriesPage({ kind = "bookings" }) {
  const isBookings = kind === "bookings";
  const { toast } = useUi();
  const router = useRouter();
  const pathname = usePathname();
  const code = useSearchParams().get("code");

  const list = useAdminList(PATH, {
    kind,
    q: "",
    status: "",
    type: "",
    paymentStatus: "",
    limit: 20,
  });
  const [stats, setStats] = useState(null);
  // Quyền ở mục này (Đơn đặt tour / Yêu cầu từ form): xem / sửa (trạng thái, ghi chú, email) / xoá
  const perm = usePermission(kind);
  const [openId, setOpenId] = useState(null);

  // Số lượng theo trạng thái — tải lại mỗi khi có thao tác (useMutation phát TODO_EVENT)
  const loadStats = useCallback(() => {
    api(`${PATH}/stats`)
      .then((r) => setStats(r.data?.[kind] ?? {}))
      .catch(() => {});
  }, [kind]);
  useEffect(() => {
    loadStats();
    window.addEventListener(TODO_EVENT, loadStats);
    return () => window.removeEventListener(TODO_EVENT, loadStats);
  }, [loadStats]);

  // Mở từ link trong email: ?code=VL-BK...
  useEffect(() => {
    if (!code) return;
    api(`${PATH}/code/${encodeURIComponent(code)}`)
      .then((r) => setOpenId(r.data.id))
      .catch((err) =>
        toast(err?.status === 404 ? `Không tìm thấy mã ${code}` : errorMessage(err), "error"),
      );
  }, [code, toast]);

  const close = () => {
    setOpenId(null);
    if (code) router.replace(pathname, { scroll: false });
  };

  const total = stats ? Object.values(stats).reduce((a, b) => a + b, 0) : null;
  const q = list.query;

  const onChanged = (doc) => list.setItems((xs) => xs.map((x) => (x.id === doc.id ? doc : x)));

  return (
    <>
      <PageHeader
        title={isBookings ? "Đơn đặt tour" : "Yêu cầu từ form"}
        description={
          isBookings
            ? "Đơn khách đặt trên trang tour. Mọi đơn đều được lưu ở đây."
            : "Yêu cầu khách gửi từ website: thiết kế tour, báo giá xe, visa & fast-track, liên hệ, đối tác."
        }
        actions={
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={() => {
              loadStats();
              list.refresh(
                isBookings
                  ? { unit: "đơn", fresh: "đơn mới" }
                  : { unit: "yêu cầu", fresh: "yêu cầu mới" },
              );
            }}
            loading={list.reloading}
          >
            Tải lại
          </Button>
        }
      />

      <Card bodyClassName="p-0">
        {/* Trạng thái */}
        <div className="[scrollbar-width:none] overflow-x-auto border-b border-slate-100 px-4 py-4">
          <div className="mx-auto flex w-max gap-2">
            <StatusChip
              active={!q.status}
              onClick={() => list.setQuery({ status: "" })}
              label="Tất cả"
              count={total}
            />
            {STATUSES.map((s) => (
              <StatusChip
                key={s.value}
                active={q.status === s.value}
                onClick={() => list.setQuery({ status: s.value })}
                label={s.label}
                count={stats ? (stats[s.value] ?? 0) : null}
                hot={s.value === "new"}
              />
            ))}
          </div>
        </div>

        {/* Bộ lọc */}
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[minmax(0,1fr)_16rem] sm:px-5">
          <SearchBox
            value={q.q}
            onChange={(v) => list.setQuery({ q: v })}
            placeholder={
              isBookings ? "Mã đơn, tên, email, SĐT, tên tour…" : "Mã, tên, email, số điện thoại…"
            }
            className="w-full"
          />
          {isBookings ? (
            <Select
              value={q.paymentStatus}
              onChange={(e) => list.setQuery({ paymentStatus: e.target.value })}
              className="w-full"
            >
              <option value="">Mọi thanh toán</option>
              <option value="unpaid">Chưa thanh toán</option>
              <option value="paid">Đã thanh toán</option>
            </Select>
          ) : (
            <Select
              value={q.type}
              onChange={(e) => list.setQuery({ type: e.target.value })}
              className="w-full"
            >
              <option value="">Tất cả loại yêu cầu</option>
              {REQUEST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          )}
        </div>

        {list.error && (
          <Notice tone="error" className="m-4">
            {list.error}
          </Notice>
        )}
        {list.loading && !list.items.length ? (
          <LoadingBlock />
        ) : !list.items.length ? (
          <EmptyState
            icon={isBookings ? CalendarCheck : Inbox}
            title={isBookings ? "Chưa có đơn đặt tour" : "Chưa có yêu cầu"}
            text="Không có mục nào khớp bộ lọc hiện tại."
          />
        ) : (
          <BusyArea busy={list.loading}>
            {/* Máy tính: bảng */}
            <div className="hidden overflow-x-auto md:block">
              {/* cột chữ dài (khách hàng, tên tour) căn trái; các cột ngắn căn giữa cả tiêu đề lẫn nội dung */}
              <table className="w-full min-w-[820px] table-fixed text-center text-sm">
                <colgroup>
                  <col className="w-[17%]" />
                  <col className={isBookings ? "w-[22%]" : "w-[25%]"} />
                  <col className={isBookings ? "w-[25%]" : "w-[19%]"} />
                  <col className="w-[11%]" />
                  <col className={isBookings ? "w-[13%]" : "w-[14%]"} />
                  <col className={isBookings ? "w-[12%]" : "w-[14%]"} />
                </colgroup>
                <thead className="bg-slate-50/70 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Mã</th>
                    <th className="px-4 py-3 text-left">Khách hàng</th>
                    <th className={cn("px-4 py-3", isBookings && "text-left")}>
                      {isBookings ? "Tour" : "Loại"}
                    </th>
                    <th className="px-4 py-3">Tạm tính</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Ngày gửi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.items.map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => setOpenId(e.id)}
                      className={cn(
                        "cursor-pointer transition hover:bg-brand-50/40",
                        e.status === "new" && "bg-sun-50/30",
                      )}
                    >
                      <td className="px-2 py-3.5">
                        <span className="flex items-center justify-center gap-1.5">
                          {e.status === "new" && (
                            <span className="size-2 shrink-0 rounded-full bg-sun-500" />
                          )}
                          <span className="font-mono text-xs font-semibold whitespace-nowrap text-slate-800">
                            {e.code}
                          </span>
                          {emailFailed(e) && (
                            <span title="Chưa gửi được email">
                              <AlertTriangle className="size-4 text-sun-500" />
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-left">
                        <p className="truncate font-semibold text-slate-900">{e.name}</p>
                        <p className="truncate text-xs text-slate-500">{e.email || e.phone}</p>
                      </td>
                      <td className={cn("px-4 py-3.5", isBookings && "text-left")}>
                        {isBookings ? (
                          <>
                            <p className="line-clamp-1 text-slate-800">{e.tour?.title || "—"}</p>
                            <p className="truncate text-xs text-slate-500">
                              {[fmtDay(e.departureDate), paxText(e)].filter(Boolean).join(" · ")}
                            </p>
                          </>
                        ) : (
                          <TypeBadge type={e.type} />
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-semibold whitespace-nowrap text-slate-800 tabular-nums">
                        {fmtMoney(e.estimate)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col items-center gap-1">
                          <StatusBadge status={e.status} />
                          {isBookings && <PaymentBadge value={e.paymentStatus} />}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap text-slate-500 tabular-nums">
                        {fmtDateTime(e.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Điện thoại: thẻ */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {list.items.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(e.id)}
                    className={cn(
                      "block w-full px-4 py-3.5 text-left active:bg-slate-50",
                      e.status === "new" && "bg-sun-50/30",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        {e.status === "new" && (
                          <span className="size-2 shrink-0 rounded-full bg-sun-500" />
                        )}
                        <span className="truncate font-mono text-xs font-semibold text-slate-700">
                          {e.code}
                        </span>
                        {emailFailed(e) && (
                          <AlertTriangle className="size-4 shrink-0 text-sun-500" />
                        )}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {fmtDateTime(e.createdAt)}
                      </span>
                    </span>
                    <span className="mt-1 flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold text-slate-900">{e.name}</span>
                      {e.estimate?.total != null && (
                        <span className="shrink-0 text-sm font-semibold text-slate-800">
                          {fmtMoney(e.estimate)}
                        </span>
                      )}
                    </span>
                    {isBookings && e.tour?.title && (
                      <span className="mt-0.5 line-clamp-1 text-xs text-slate-600">
                        {e.tour.title}
                      </span>
                    )}
                    {isBookings && (e.departureDate || e.adults) && (
                      <span className="block text-xs text-slate-500">
                        {[fmtDay(e.departureDate), paxText(e)].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {!isBookings && <TypeBadge type={e.type} />}
                      <StatusBadge status={e.status} />
                      {isBookings && <PaymentBadge value={e.paymentStatus} />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </BusyArea>
        )}
        <Pagination
          meta={list.meta}
          onPage={(page) => list.setQuery({ page })}
          unit={isBookings ? "đơn" : "yêu cầu"}
        />
      </Card>

      {openId && (
        <EnquiryDetail
          key={openId}
          id={openId}
          canEdit={perm.canEdit}
          canDelete={perm.canDelete}
          onClose={close}
          onChanged={onChanged}
          onDeleted={() => {
            close();
            list.reload();
          }}
        />
      )}
    </>
  );
}

function StatusChip({ active, onClick, label, count, hot }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 transition",
        active
          ? "bg-brand-700 text-white ring-brand-700"
          : "bg-white text-slate-600 ring-slate-200 hover:ring-brand-300",
      )}
    >
      {label}
      {count != null && (
        <span
          className={cn(
            "min-w-5 rounded-full px-1.5 text-center text-[10px] leading-4 font-bold",
            active
              ? "bg-white/20 text-white"
              : hot && count > 0
                ? "bg-sun-500 text-white"
                : "bg-slate-100 text-slate-500",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* =========================================================================
 * Chi tiết đơn / yêu cầu
 * ========================================================================= */

function EnquiryDetail({ id, canEdit, canDelete, onClose, onChanged, onDeleted }) {
  const { toast, confirm } = useUi();
  const { run, busy } = useMutation([]);
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [resending, setResending] = useState(false);

  const apply = useCallback(
    (doc) => {
      setItem(doc);
      onChanged(doc);
    },
    [onChanged],
  );

  const refresh = useCallback(
    () =>
      api(`${PATH}/${id}`)
        .then((r) => {
          setItem(r.data);
          return r.data;
        })
        .catch((err) => {
          setError(errorMessage(err));
          return null;
        }),
    [id],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Kết quả API là bản ghi đầy đủ → dùng luôn; không thì tải lại */
  const settle = async (r) => {
    if (!r) return;
    if (r.data?.id) apply(r.data);
    else {
      const doc = await refresh();
      if (doc) onChanged(doc);
    }
  };

  const patch = async (body, msg) =>
    settle(
      await run(() => api(`${PATH}/${id}`, { method: "PATCH", body }), msg, {
        retry: () => patch(body, msg),
      }),
    );

  const addNote = async () => {
    const text = note.trim();
    if (!text) return;
    const r = await run(
      () => api(`${PATH}/${id}/notes`, { method: "POST", body: { text } }),
      "Đã thêm ghi chú",
    );
    if (r) {
      setNote("");
      await settle(r);
    }
  };

  const removeNote = async (n) => {
    const ok = await confirm({
      title: "Xoá ghi chú?",
      message: "Ghi chú nội bộ này sẽ bị xoá.",
      confirmText: "Xoá",
      danger: true,
    });
    if (!ok) return;
    settle(
      await run(
        () => api(`${PATH}/${id}/notes/${n._id ?? n.id}`, { method: "DELETE" }),
        "Đã xoá ghi chú",
      ),
    );
  };

  const resend = async () => {
    setResending(true);
    try {
      await api(`${PATH}/${id}/resend-email`, { method: "POST" });
      const doc = await refresh();
      if (doc) {
        onChanged(doc);
        if (emailFailed(doc))
          toast.warning("Hộp thư nhận có thể đang lỗi hoặc đầy. Vui lòng thử lại sau ít phút.", {
            title: "Vẫn chưa gửi được email",
            action: { label: "Thử lại", onClick: resend },
          });
        else toast("Đã gửi lại email");
      }
    } catch (err) {
      if (err?.code === "MAIL_NOT_CONFIGURED" || err?.status === 503)
        toast.error(MAIL_OFF_TEXT, { title: "Chưa gửi được email" });
      else toastError(toast, err, { title: "Chưa gửi được email", retry: resend });
      refresh();
    } finally {
      setResending(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: "Xoá vĩnh viễn?",
      message: `${item.code} của ${item.name} sẽ bị xoá và không khôi phục được. Nếu chỉ muốn bỏ qua, hãy đổi trạng thái sang "Hủy".`,
      confirmText: "Xoá",
      danger: true,
    });
    if (!ok) return;
    if (await run(() => api(`${PATH}/${id}`, { method: "DELETE" }), `Đã xoá ${item.code}`))
      onDeleted();
  };

  const isBooking = item?.type === "booking";
  const details = Object.entries(item?.details ?? {}).filter(([, v]) => detailValue(v) !== "");
  const cur = item?.estimate?.currency || "USD";

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={item ? `${typeOf(item.type).label} · ${item.code}` : "Chi tiết"}
      footer={
        item && (
          <>
            {canDelete && (
              <Button
                variant="danger"
                icon={Trash2}
                onClick={remove}
                disabled={busy}
                className="mr-auto"
              >
                Xoá
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
          </>
        )
      }
    >
      {error && !item ? (
        <Notice tone="error">{error}</Notice>
      ) : !item ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-6">
          {/* Mã + xử lý */}
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-base font-bold text-slate-900">{item.code}</span>
              <CopyBtn value={item.code} label="mã" />
              <TypeBadge type={item.type} />
              <span className="ml-auto text-xs text-slate-500">
                Gửi lúc {fmtDateTime(item.createdAt)}
              </span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                  Trạng thái xử lý
                </span>
                <Select
                  value={item.status}
                  disabled={busy || !canEdit}
                  onChange={(e) =>
                    patch(
                      { status: e.target.value },
                      `Đã chuyển sang "${statusOf(e.target.value).label}"`,
                    )
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </label>
              {/* Thanh toán chỉ áp dụng cho đơn đặt tour; yêu cầu báo giá (xe, visa…) chưa có tiền để đánh dấu */}
              {item.type !== "booking" ? (
                <p className="flex items-end pb-2.5 text-[13px] leading-snug text-slate-500">
                  Chuyển trạng thái sau khi đã liên hệ hoặc gửi báo giá cho khách.
                </p>
              ) : (
                <div className="flex items-end pb-2">
                  <Toggle
                    checked={item.paymentStatus === "paid"}
                    disabled={busy || !canEdit}
                    onChange={(paid) =>
                      patch(
                        { paymentStatus: paid ? "paid" : "unpaid" },
                        paid ? "Đã đánh dấu đã thanh toán" : "Đã đánh dấu chưa thanh toán",
                      )
                    }
                    label={item.paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
                    hint="Bật khi khách đã chuyển tiền"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Khách hàng */}
          <Section title="Khách hàng">
            <p className="text-lg font-bold text-slate-900">{item.name}</p>
            <div className="mt-3 flex flex-col gap-2">
              {item.email && (
                <ContactRow icon={Mail} href={`mailto:${item.email}`} text={item.email}>
                  <CopyBtn value={item.email} label="email" />
                </ContactRow>
              )}
              {item.phone && (
                <ContactRow
                  icon={Phone}
                  href={`tel:${item.phone.replace(/[^\d+]/g, "")}`}
                  text={item.phone}
                >
                  <CopyBtn value={item.phone} label="số điện thoại" />
                  <a
                    href={`https://wa.me/${waNumber(item.phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-7 items-center gap-1 rounded-lg bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                  >
                    <MessageCircle className="size-3.5" /> WhatsApp
                  </a>
                </ContactRow>
              )}
            </div>
            <InfoGrid
              className="mt-4"
              rows={[
                ["Quốc tịch", item.nationality],
                ["Ngôn ngữ trang", LANG_LABEL[item.lang] ?? item.lang],
              ]}
            />
          </Section>

          {/* Tour */}
          {isBooking && (
            <Section title="Tour đặt">
              <p className="font-semibold text-slate-900">{item.tour?.title || "—"}</p>
              {item.tour?.code && (
                <p className="mt-0.5 font-mono text-xs text-slate-500">{item.tour.code}</p>
              )}
              <InfoGrid
                className="mt-3"
                rows={[
                  ["Ngày khởi hành", fmtDay(item.departureDate)],
                  ["Người lớn", item.adults],
                  [
                    "Trẻ em",
                    item.childAges?.length
                      ? `${item.childAges.length} (${item.childAges.map((a) => `${a} tuổi`).join(", ")})`
                      : "",
                  ],
                ]}
              />
            </Section>
          )}

          {/* Giá tạm tính */}
          {(item.estimate?.total != null || item.estimate?.lines?.length > 0) && (
            <Section title="Giá tạm tính">
              <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
                {item.estimate.lines?.map((l, i) => (
                  <div
                    key={i}
                    className="flex justify-between gap-4 border-b border-slate-100 px-4 py-2.5 text-sm"
                  >
                    <span className="text-slate-600">{priceLineVi(l.label)}</span>
                    <span className="font-medium whitespace-nowrap text-slate-800">
                      {fmtAmount(l.amount, cur)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between gap-4 bg-brand-50/60 px-4 py-3 text-sm">
                  <span className="font-semibold text-slate-800">Tổng</span>
                  <span className="font-bold text-brand-800">{fmtMoney(item.estimate)}</span>
                </div>
              </div>
            </Section>
          )}

          {/* Thông tin form */}
          {details.length > 0 && (
            <Section title="Thông tin khách điền">
              <InfoGrid rows={details.map(([k, v]) => [detailLabel(k), detailValue(v)])} />
            </Section>
          )}

          {item.message && (
            <Section title="Lời nhắn">
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed whitespace-pre-line text-slate-700 ring-1 ring-slate-100">
                {item.message}
              </p>
            </Section>
          )}

          {item.page && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Globe className="size-3.5 shrink-0" />
              Gửi từ trang: <span className="truncate font-mono">{item.page}</span>
            </p>
          )}

          {/* Email */}
          <Section title="Email thông báo">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <EmailState label="Gửi khách" value={item.emailStatus?.customer} />
              <EmailState label="Gửi công ty" value={item.emailStatus?.company} />
              {canEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Send}
                  loading={resending}
                  onClick={resend}
                  className="ml-auto"
                >
                  Gửi lại email
                </Button>
              )}
            </div>
            {emailFailed(item) && (
              <Notice tone="warn" className="mt-3">
                {item.emailStatus?.customer === "failed"
                  ? "Chưa gửi được email cho khách."
                  : "Chưa gửi được email thông báo cho công ty."}{" "}
                {canEdit && <>Bấm &ldquo;Gửi lại email&rdquo; để thử lại.</>}
              </Notice>
            )}
          </Section>

          {/* Ghi chú nội bộ */}
          <Section title="Ghi chú nội bộ" hint="Chỉ nhân viên thấy, khách không nhận được.">
            {item.notes?.length > 0 && (
              <ul className="mb-3 space-y-2">
                {item.notes.map((n) => (
                  <li
                    key={n._id ?? n.id ?? n.at}
                    className="group flex gap-3 rounded-xl bg-amber-50/60 px-3.5 py-2.5 ring-1 ring-amber-100"
                  >
                    <StickyNote className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-relaxed whitespace-pre-line text-slate-800">
                        {n.text}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {n.by || "—"} · {fmtDateTime(n.at)}
                      </p>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => removeNote(n)}
                        aria-label="Xoá ghi chú"
                        className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-sun-600"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canEdit ? (
              <>
                <Textarea
                  rows={2}
                  value={note}
                  maxLength={2000}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addNote();
                  }}
                  placeholder="VD: Đã gọi khách, hẹn gửi lịch trình chi tiết ngày mai…"
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={addNote}
                    disabled={!note.trim()}
                    loading={busy && !!note.trim()}
                  >
                    Thêm ghi chú
                  </Button>
                </div>
              </>
            ) : (
              !item.notes?.length && <p className="text-sm text-slate-400">Chưa có ghi chú.</p>
            )}
          </Section>
        </div>
      )}
    </Modal>
  );
}

function Section({ title, hint, children }) {
  return (
    <section>
      <h4 className="text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase">{title}</h4>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function InfoGrid({ rows, className }) {
  const shown = rows.filter(([, v]) => v !== "" && v != null);
  if (!shown.length) return null;
  return (
    <dl className={cn("grid gap-x-6 gap-y-3 sm:grid-cols-2", className)}>
      {shown.map(([k, v]) => (
        <div key={k} className={cn("min-w-0", String(v).length > 60 && "sm:col-span-2")}>
          <dt className="text-xs text-slate-500">{k}</dt>
          <dd className="mt-0.5 text-sm font-medium break-words whitespace-pre-line text-slate-800">
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ContactRow({ icon: Icon, href, text, children }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={href}
        className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-brand-700 transition-colors hover:text-sun-600"
      >
        <Icon className="size-4 shrink-0 text-slate-400" />
        <span className="truncate">{text}</span>
      </a>
      {children}
    </div>
  );
}

function CopyBtn({ value, label }) {
  const { toast } = useUi();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast(`Đã sao chép ${label}`);
    } catch {
      toast("Không sao chép được, vui lòng chọn và sao chép bằng tay", "error");
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={`Sao chép ${label}`}
      aria-label={`Sao chép ${label}`}
      className="grid size-7 place-items-center rounded-lg text-slate-400 ring-1 ring-slate-200 hover:bg-white hover:text-brand-700"
    >
      <Copy className="size-3.5" />
    </button>
  );
}

function EmailState({ label, value }) {
  const s = EMAIL_STATE[value] ?? EMAIL_STATE.pending;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-slate-600">{label}:</span>
      <Badge tone={s.tone}>{s.label}</Badge>
    </span>
  );
}
