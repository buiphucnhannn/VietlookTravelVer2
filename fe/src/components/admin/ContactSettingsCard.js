"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  ChevronRight,
  Clock,
  Contact,
  Copy,
  Eye,
  Handshake,
  Mail,
  MapPin,
  MessageCircle,
  PanelBottom,
  PanelTop,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Share2,
  Smartphone,
  Trash2,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  CONTACT_DEFAULTS,
  PHONE_PURPOSES,
  contactView,
  mergeContact,
  normalizePhone,
  phoneChannels,
  phoneDigits,
} from "@/lib/contact.mjs";
import {
  FacebookIcon,
  GoogleMapsIcon,
  LineIcon,
  TripAdvisorIcon,
  WeChatIcon,
  WhatsAppIcon,
  ZaloIcon,
} from "@/components/ui/BrandIcons";
import { useMutation } from "./hooks";
import {
  Button,
  Card,
  Field,
  Input,
  LANGS,
  LangTabs,
  LoadingBlock,
  Notice,
  useUi,
  useUnsavedGuard,
} from "./ui";

/**
 * CMS → Cài đặt → Thông tin liên hệ: số điện thoại (kèm kênh Gọi / Zalo / WhatsApp / WeChat / LINE), email,
 * địa chỉ, giờ làm việc, mạng xã hội, bản đồ. Dùng ở MỌI trang website (thanh trên cùng, chân trang, trang Liên hệ,
 * nút chat nổi, ô liên hệ trang tour / thuê xe, dữ liệu cho Google) + email gửi khách.
 * Lưu: PUT /settings/contact (máy chủ kiểm tra lại: contact.validator.js) → làm mới thẻ cache "settings" ngay.
 * Bên phải: bản xem trước trực tiếp, đổi theo từng chữ đang gõ.
 */

const TAGS = ["settings"];
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PURPOSES = [
  { key: "call", label: "Gọi", icon: Phone, on: "bg-sun-500 text-white ring-sun-500" },
  { key: "zalo", label: "Zalo", icon: ZaloIcon, on: "bg-[#0068ff] text-white ring-[#0068ff]" },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: WhatsAppIcon,
    on: "bg-[#25d366] text-white ring-[#25d366]",
  },
  {
    key: "wechat",
    label: "WeChat",
    icon: WeChatIcon,
    on: "bg-[#07c160] text-white ring-[#07c160]",
  },
  { key: "line", label: "LINE", icon: LineIcon, on: "bg-[#06c755] text-white ring-[#06c755]" },
];
const LANG_NAME = { vi: "tiếng Việt", en: "tiếng Anh", zh: "tiếng Trung" };

/** Chữ trên website theo ngôn ngữ (chỉ để xem trước) */
const UI = {
  en: {
    dmc: "Vietnam Tour Operator & DMC since 2009",
    partners: "B2B Partners",
    plan: "Free Trip Planning",
    contact: "Contact",
    wechat: "WeChat ID",
  },
  zh: {
    dmc: "越南本地地接社 · 始于2009年",
    partners: "同业合作 B2B",
    plan: "免费定制行程",
    contact: "联系方式",
    wechat: "微信号",
  },
  vi: {
    dmc: "Công ty lữ hành & DMC Việt Nam từ năm 2009",
    partners: "Đối tác B2B",
    plan: "Tư vấn lịch trình miễn phí",
    contact: "Liên hệ",
    wechat: "WeChat ID",
  },
};

const blankPhone = () => ({
  number: "",
  call: false,
  zalo: false,
  whatsapp: true,
  wechat: false,
  line: false,
});
/** Dữ liệu đã lưu → form (đủ ô) */
const toForm = (d) => {
  const m = mergeContact(d);
  return { ...m, address: { ...m.address }, hours: { ...m.hours }, phones: m.phones };
};

/** Dán cả mã nhúng <iframe src="…"> của Google Maps → lấy riêng link */
const embedSrc = (v) => v.match(/src=["']([^"']+)["']/i)?.[1]?.replace(/&amp;/g, "&") ?? v;

const hostOk = (url, hosts) => {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return "https";
    const h = u.hostname.toLowerCase();
    return hosts.some((x) => h === x || h.endsWith(`.${x}`)) ? "" : "host";
  } catch {
    return "bad";
  }
};

const LINKS = [
  {
    name: "facebook",
    label: "Trang Facebook",
    icon: FacebookIcon,
    iconClass: "text-[#1877f2]",
    hosts: ["facebook.com", "fb.com"],
    placeholder: "https://www.facebook.com/vietlooktravelhanoi",
    hint: "Mở trang Facebook của công ty → chép link trên thanh địa chỉ.",
  },
  {
    name: "tripadvisor",
    label: "Trang Tripadvisor",
    icon: TripAdvisorIcon,
    iconClass: "text-[#00af87]",
    hosts: ["tripadvisor.com", "tripadvisor.com.vn", "tripadvisor.co.uk"],
    placeholder: "https://www.tripadvisor.com/Attraction_Review-…",
    hint: "Trang đánh giá của công ty trên Tripadvisor.",
  },
  {
    name: "mapsLink",
    label: "Link Google Maps",
    icon: GoogleMapsIcon,
    hosts: ["google.com", "google.com.vn", "maps.app.goo.gl", "goo.gl"],
    placeholder: "https://maps.app.goo.gl/…",
    hint: "Google Maps → tìm công ty → Chia sẻ → Sao chép đường liên kết. Dùng cho nút “Chỉ đường”.",
  },
  {
    name: "mapsEmbed",
    label: "Bản đồ nhúng (trang Liên hệ)",
    icon: MapPin,
    iconClass: "text-sun-500",
    hosts: ["google.com", "google.com.vn"],
    placeholder: "https://www.google.com/maps/embed?pb=…",
    hint: "Google Maps → Chia sẻ → Nhúng bản đồ → Sao chép HTML rồi dán cả đoạn vào đây (tự lấy link).",
    embed: true,
  },
];

/** Kiểm tra giống máy chủ → { "đường.dẫn": "câu lỗi" } */
function validate(f) {
  const e = {};
  const req = (k, label) => !String(f[k] ?? "").trim() && (e[k] = `Vui lòng nhập ${label}`);
  req("legalName", "tên công ty (tiếng Anh)");
  req("legalNameVi", "tên công ty (tiếng Việt)");
  req("businessNo", "mã số doanh nghiệp");
  req("licenceNo", "số giấy phép lữ hành");
  req("streetAddress", "số nhà, đường");
  req("city", "thành phố");
  for (const k of ["address", "hours"])
    for (const l of LANGS.map((x) => x.key))
      if (!String(f[k]?.[l] ?? "").trim())
        e[`${k}.${l}`] =
          `Vui lòng nhập ${k === "address" ? "địa chỉ" : "giờ làm việc"} (${LANG_NAME[l]})`;
  const seen = new Set();
  f.phones.forEach((p, i) => {
    const n = normalizePhone(p.number);
    if (!String(p.number).trim()) e[`phones.${i}`] = "Vui lòng nhập số điện thoại";
    else if (!n) e[`phones.${i}`] = "Số chưa đúng — VD +84 98 339 3588 hoặc 0983 393 588";
    else if (seen.has(phoneDigits(n))) e[`phones.${i}`] = "Số điện thoại bị trùng";
    if (n) seen.add(phoneDigits(n));
  });
  const has = (k) => f.phones.some((p) => p[k]);
  const missing = [
    !has("call") && "“Gọi” (số hotline ở đầu trang)",
    !has("whatsapp") && "“WhatsApp”",
    !has("zalo") && "“Zalo”",
  ].filter(Boolean);
  if (!f.phones.length) e.phones = "Cần ít nhất 1 số điện thoại";
  else if (missing.length) e.phones = `Cần ít nhất 1 số tích ${missing.join(", ")}`;
  if (!f.email.trim()) e.email = "Vui lòng nhập email";
  else if (!EMAIL_RX.test(f.email.trim())) e.email = "Email chưa đúng — VD info@vietlooktravel.com";
  if (!f.wechatId.trim()) e.wechatId = "Vui lòng nhập WeChat ID";
  else if (!/^[\w.-]+$/.test(f.wechatId.trim()))
    e.wechatId = "WeChat ID chỉ gồm chữ không dấu, số, dấu gạch và chấm";
  if (f.lineId.trim() && !/^@?[\w.-]+$/.test(f.lineId.trim()))
    e.lineId = "LINE ID chỉ gồm chữ không dấu, số, dấu gạch, chấm (và @ ở đầu)";
  for (const l of LINKS) {
    const v = String(f[l.name] ?? "").trim();
    if (!v) {
      e[l.name] = `Vui lòng nhập ${l.label.toLowerCase()}`;
      continue;
    }
    const bad = hostOk(v, l.hosts);
    if (bad === "https") e[l.name] = "Link phải bắt đầu bằng https://";
    else if (bad === "bad") e[l.name] = "Link chưa đúng — hãy dán nguyên link từ trình duyệt";
    else if (bad) e[l.name] = `Link chưa đúng trang (${l.hosts[0]})`;
    else if (l.embed && !/output=embed|\/maps\/embed/.test(v))
      e[l.name] = "Dùng link “Nhúng bản đồ” của Google Maps (có /maps/embed)";
  }
  return e;
}

/** Form → dữ liệu gửi máy chủ (bỏ khoảng trắng thừa, chuẩn hoá số) */
const toBody = (f) => {
  const trim = (v) => String(v ?? "").trim();
  const loc = (o) => Object.fromEntries(LANGS.map((l) => [l.key, trim(o?.[l.key])]));
  return {
    ...Object.fromEntries(
      Object.keys(CONTACT_DEFAULTS)
        .filter((k) => typeof CONTACT_DEFAULTS[k] === "string")
        .map((k) => [k, trim(f[k])]),
    ),
    email: trim(f.email).toLowerCase(),
    address: loc(f.address),
    hours: loc(f.hours),
    phones: f.phones.map((p) => ({
      number: normalizePhone(p.number) ?? trim(p.number),
      ...Object.fromEntries(PHONE_PURPOSES.map((k) => [k, Boolean(p[k])])),
    })),
  };
};

export default function ContactSettingsCard() {
  const title = "Thông tin liên hệ";
  const [state, setState] = useState({ saved: null, form: null, error: "" });
  const [nonce, setNonce] = useState(0);
  const [lang, setLang] = useState("vi");
  const [tried, setTried] = useState(false);
  const [pv, setPv] = useState("header"); // màn xem trước đang mở
  const { run, busy } = useMutation(TAGS);
  const { toast, confirm } = useUi();

  useEffect(() => {
    let alive = true;
    api("/settings/contact")
      .then((r) => alive && setState({ saved: toForm(r.data), form: toForm(r.data), error: "" }))
      .catch((err) => alive && setState((s) => ({ ...s, error: errorMessage(err) })));
    return () => {
      alive = false;
    };
  }, [nonce]);

  const form = state.form;
  const dirty = Boolean(form) && JSON.stringify(form) !== JSON.stringify(state.saved);
  useUnsavedGuard(dirty);
  const errors = useMemo(() => (form ? validate(form) : {}), [form]);
  const view = useMemo(() => (form ? contactView(toBody(form)) : null), [form]);

  if (state.error || !form)
    return (
      <div id="contact" className="scroll-mt-24">
        <Card icon={Contact} title={title}>
          {state.error ? (
            <Notice tone="error">
              {state.error}{" "}
              <button
                type="button"
                onClick={() => {
                  setState((s) => ({ ...s, error: "" }));
                  setNonce((n) => n + 1);
                }}
                className="font-semibold underline"
              >
                Thử lại
              </button>
            </Notice>
          ) : (
            <LoadingBlock />
          )}
        </Card>
      </div>
    );

  const set = (patch) => setState((s) => ({ ...s, form: { ...s.form, ...patch } }));
  const setPhone = (i, patch) =>
    set({ phones: form.phones.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const movePhone = (i, d) => {
    const list = [...form.phones];
    [list[i], list[i + d]] = [list[i + d], list[i]];
    set({ phones: list });
  };
  // lỗi "bắt buộc" chỉ hiện sau lần bấm Lưu đầu tiên; lỗi sai định dạng hiện ngay khi ô có chữ
  const err = (path) => {
    const msg = errors[path];
    if (!msg) return "";
    if (tried) return msg;
    return /Vui lòng nhập|Cần ít nhất/.test(msg) ? "" : msg;
  };
  const errCount = Object.keys(errors).length;

  const save = async () => {
    setTried(true);
    if (errCount) {
      toast.error(Object.values(errors)[0], {
        title: `Còn ${errCount} ô cần sửa trước khi lưu`,
      });
      return;
    }
    const r = await run(
      () => api("/settings/contact", { method: "PUT", body: toBody(form) }),
      "Đã lưu thông tin liên hệ — website đã cập nhật",
    );
    if (r?.data) {
      const next = toForm(r.data);
      setState({ saved: next, form: next, error: "" });
      setTried(false);
    }
  };
  const undo = async () => {
    const ok = await confirm({
      title: "Bỏ các thay đổi chưa lưu?",
      message: "Các ô sẽ trở về thông tin đang hiện trên website.",
      confirmText: "Bỏ thay đổi",
    });
    if (ok) {
      setState((s) => ({ ...s, form: s.saved }));
      setTried(false);
    }
  };

  return (
    <div id="contact" className="scroll-mt-24">
      <Card
        icon={Contact}
        title={title}
        className="overflow-visible"
        description="Số điện thoại, email, địa chỉ, mạng xã hội — hiện trên mọi trang website (đầu trang, chân trang, trang Liên hệ, nút chat) và trong email gửi khách."
        actions={
          <LangTabs
            value={lang}
            onChange={setLang}
            filled={Object.fromEntries(
              LANGS.map((l) => [
                l.key,
                Boolean(form.address[l.key]?.trim() && form.hours[l.key]?.trim()),
              ]),
            )}
          />
        }
      >
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
          <div className="min-w-0 space-y-8">
            {/* ---------- Công ty & địa chỉ ---------- */}
            <Group
              onFocus={() => setPv(GROUP_VIEW.company)}
              icon={Building2}
              title="Công ty & địa chỉ"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Tên công ty (tiếng Anh)"
                  hint="Hiện ở chân trang và trang Liên hệ (mọi ngôn ngữ)."
                  error={err("legalName")}
                  required
                >
                  <Input
                    value={form.legalName}
                    maxLength={160}
                    placeholder="Vietlook Travel and Trading Company Limited"
                    onChange={(e) => set({ legalName: e.target.value })}
                  />
                </Field>
                <Field
                  label="Tên công ty (tiếng Việt)"
                  hint="Dùng ở chân email gửi khách tiếng Việt."
                  error={err("legalNameVi")}
                  required
                >
                  <Input
                    value={form.legalNameVi}
                    maxLength={160}
                    placeholder="Công ty TNHH Du lịch và Thương mại Vietlook"
                    onChange={(e) => set({ legalNameVi: e.target.value })}
                  />
                </Field>
                <Field label="Mã số doanh nghiệp" error={err("businessNo")} required>
                  <Input
                    value={form.businessNo}
                    maxLength={40}
                    placeholder="0104189511"
                    onChange={(e) => set({ businessNo: e.target.value })}
                  />
                </Field>
                <Field label="Số giấy phép lữ hành quốc tế" error={err("licenceNo")} required>
                  <Input
                    value={form.licenceNo}
                    maxLength={80}
                    placeholder="01-176/2022/CDLQGVN-GP LHQT"
                    onChange={(e) => set({ licenceNo: e.target.value })}
                  />
                </Field>
              </div>
              <Field
                label={`Địa chỉ văn phòng · ${LANG_NAME[lang]}`}
                hint="Đổi ngôn ngữ ở nút VI / EN / 中文 phía trên. Cần nhập đủ cả 3 ngôn ngữ."
                error={
                  err(`address.${lang}`) || LANGS.map((l) => err(`address.${l.key}`)).find(Boolean)
                }
                required
              >
                <Input
                  value={form.address[lang] ?? ""}
                  maxLength={300}
                  placeholder={CONTACT_DEFAULTS.address[lang]}
                  onChange={(e) => set({ address: { ...form.address, [lang]: e.target.value } })}
                />
              </Field>
              <details className="group rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-700">
                  <ChevronRight className="size-4 transition group-open:rotate-90" />
                  Địa chỉ cho Google (tiếng Anh, tách từng phần)
                  {(errors.streetAddress || errors.city) && tried && (
                    <span className="ml-auto text-xs font-medium text-sun-600">Cần sửa</span>
                  )}
                </summary>
                <p className="mt-2 text-xs text-slate-500">
                  Google đọc phần này để hiện đúng địa chỉ công ty trong kết quả tìm kiếm. Khách
                  không nhìn thấy.
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
                  <Field label="Số nhà, đường, quận" error={err("streetAddress")} required>
                    <Input
                      value={form.streetAddress}
                      maxLength={200}
                      placeholder="01 Lien Ke 20, Van Khe Urban Area, Ha Dong"
                      onChange={(e) => set({ streetAddress: e.target.value })}
                    />
                  </Field>
                  <Field label="Thành phố" error={err("city")} required>
                    <Input
                      value={form.city}
                      maxLength={80}
                      placeholder="Hanoi"
                      onChange={(e) => set({ city: e.target.value })}
                    />
                  </Field>
                  <Field label="Mã bưu chính">
                    <Input
                      value={form.postalCode}
                      maxLength={20}
                      placeholder="12113"
                      onChange={(e) => set({ postalCode: e.target.value })}
                    />
                  </Field>
                </div>
              </details>
            </Group>

            {/* ---------- Điện thoại & nhắn tin ---------- */}
            <Group
              onFocus={() => setPv(GROUP_VIEW.phones)}
              icon={Smartphone}
              title="Điện thoại & nhắn tin"
              text="Tích các kênh khách dùng được với từng số. Số đầu tiên có “Gọi” là số hotline ở đầu trang."
            >
              <ul className="space-y-3">
                {form.phones.map((p, i) => {
                  const e = err(`phones.${i}`);
                  const n = normalizePhone(p.number);
                  const chips = phoneChannels(p)[lang];
                  return (
                    <li
                      key={i}
                      className={cn(
                        "rounded-2xl p-3.5 ring-1 sm:p-4",
                        e ? "ring-sun-200 bg-sun-50/40" : "bg-white ring-slate-200",
                      )}
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        <span className="mt-2 grid size-7 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1 basis-56">
                          <Input
                            value={p.number}
                            inputMode="tel"
                            maxLength={40}
                            aria-label={`Số điện thoại ${i + 1}`}
                            aria-invalid={!!e}
                            placeholder="+84 98 339 3588"
                            className="font-semibold tabular-nums"
                            onChange={(ev) => setPhone(i, { number: ev.target.value })}
                            onBlur={() => n && n !== p.number && setPhone(i, { number: n })}
                          />
                          {e ? (
                            <p className="mt-1.5 text-xs font-medium text-sun-600">{e}</p>
                          ) : (
                            n &&
                            n !== p.number.trim() && (
                              <p className="mt-1.5 text-xs text-slate-500">
                                Sẽ lưu là <b className="text-slate-700">{n}</b>
                              </p>
                            )
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <IconBtn
                            icon={ArrowUp}
                            label="Lên trên"
                            disabled={i === 0}
                            onClick={() => movePhone(i, -1)}
                          />
                          <IconBtn
                            icon={ArrowDown}
                            label="Xuống dưới"
                            disabled={i === form.phones.length - 1}
                            onClick={() => movePhone(i, 1)}
                          />
                          <IconBtn
                            icon={Trash2}
                            label="Xoá số này"
                            danger
                            disabled={form.phones.length === 1}
                            onClick={() => set({ phones: form.phones.filter((_, j) => j !== i) })}
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:pl-10">
                        <span className="mr-1 text-xs font-medium text-slate-500">Dùng để:</span>
                        {PURPOSES.map((x) => (
                          <label
                            key={x.key}
                            className={cn(
                              "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition select-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-500",
                              p[x.key]
                                ? x.on
                                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
                            )}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={p[x.key]}
                              onChange={(ev) => setPhone(i, { [x.key]: ev.target.checked })}
                            />
                            <x.icon className="size-3.5" />
                            {x.label}
                          </label>
                        ))}
                      </div>
                      <p className="mt-2.5 text-xs text-slate-500 sm:pl-10">
                        Dòng chữ dưới số trên website:{" "}
                        <span className="font-medium text-slate-700">
                          {chips || "— (chưa tích kênh nào)"}
                        </span>
                      </p>
                    </li>
                  );
                })}
              </ul>
              {err("phones") && <p className="text-xs font-medium text-sun-600">{err("phones")}</p>}
              {form.phones.length < 6 && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Plus}
                  onClick={() => set({ phones: [...form.phones, blankPhone()] })}
                >
                  Thêm số điện thoại
                </Button>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="WeChat ID"
                  hint="Khách Trung Quốc tìm ID này trong WeChat để kết bạn."
                  error={err("wechatId")}
                  required
                >
                  <Input
                    value={form.wechatId}
                    maxLength={60}
                    placeholder="TA14102014"
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) => set({ wechatId: e.target.value.trim() })}
                  />
                </Field>
                <Field
                  label="LINE ID (không bắt buộc)"
                  hint="Để trống thì khách kết bạn LINE bằng các số tích “LINE”."
                  error={err("lineId")}
                >
                  <Input
                    value={form.lineId}
                    maxLength={60}
                    placeholder="@vietlook"
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) => set({ lineId: e.target.value.trim() })}
                  />
                </Field>
              </div>
            </Group>

            {/* ---------- Email ---------- */}
            <Group onFocus={() => setPv(GROUP_VIEW.email)} icon={Mail} title="Email">
              <Field
                label="Email liên hệ hiện cho khách"
                hint="Hiện ở đầu trang, chân trang, trang Liên hệ và email gửi khách. (Hộp thư NHẬN thông báo đơn mới cài ở mục “Email thông báo đơn mới” bên dưới.)"
                error={err("email")}
                required
              >
                <Input
                  type="email"
                  value={form.email}
                  maxLength={254}
                  placeholder="info@vietlooktravel.com"
                  onChange={(e) => set({ email: e.target.value })}
                />
              </Field>
            </Group>

            {/* ---------- Mạng xã hội & bản đồ ---------- */}
            <Group
              onFocus={() => setPv(GROUP_VIEW.social)}
              icon={Share2}
              title="Mạng xã hội & bản đồ"
            >
              <div className="grid gap-5 lg:grid-cols-2">
                {LINKS.map((l) => (
                  <Field
                    key={l.name}
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        <l.icon className={cn("size-4", l.iconClass)} />
                        {l.label}
                      </span>
                    }
                    hint={l.hint}
                    error={err(l.name)}
                    required
                  >
                    <Input
                      value={form[l.name]}
                      maxLength={l.embed ? 2000 : 600}
                      placeholder={l.placeholder}
                      spellCheck={false}
                      autoComplete="off"
                      onChange={(e) =>
                        set({
                          [l.name]: l.embed
                            ? embedSrc(e.target.value.trim())
                            : e.target.value.trim(),
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
            </Group>

            {/* ---------- Giờ làm việc ---------- */}
            <Group onFocus={() => setPv(GROUP_VIEW.hours)} icon={Clock} title="Giờ làm việc">
              <Field
                label={`Giờ làm việc · ${LANG_NAME[lang]}`}
                hint="Hiện ở trang Liên hệ. Cần nhập đủ cả 3 ngôn ngữ (nút VI / EN / 中文 phía trên)."
                error={
                  err(`hours.${lang}`) || LANGS.map((l) => err(`hours.${l.key}`)).find(Boolean)
                }
                required
              >
                <Input
                  value={form.hours[lang] ?? ""}
                  maxLength={200}
                  placeholder={CONTACT_DEFAULTS.hours[lang]}
                  onChange={(e) => set({ hours: { ...form.hours, [lang]: e.target.value } })}
                />
              </Field>
            </Group>
          </div>

          {/* ---------- Xem trước: dính khi cuộn, tab theo nhóm ô đang sửa ---------- */}
          <div className="min-w-0">
            <div className="xl:sticky xl:top-20">
              <PreviewPanel view={view} lang={lang} active={pv} onPick={setPv} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-slate-100 pt-5">
          <p className="min-w-0 text-xs leading-relaxed text-slate-500">
            {dirty ? (
              <span className="font-semibold text-amber-700">
                Có thay đổi chưa lưu
                {tried && errCount ? ` · còn ${errCount} ô cần sửa` : ""}
              </span>
            ) : (
              "Bấm Lưu → website và email gửi khách dùng thông tin mới ngay."
            )}
          </p>
          <div className="ml-auto flex flex-wrap justify-end gap-2">
            {dirty && (
              <Button variant="ghost" icon={RotateCcw} onClick={undo} disabled={busy}>
                Hoàn tác
              </Button>
            )}
            <Button icon={Save} onClick={save} loading={busy} disabled={!dirty}>
              Lưu
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Khối nhỏ ---------- */

function Group({ icon: Icon, title, text, children, onFocus }) {
  return (
    <section className="space-y-4" onFocus={onFocus}>
      <header className="flex items-start gap-2.5 border-b border-slate-100 pb-2.5">
        <Icon className="mt-0.5 size-4 shrink-0 text-brand-600" />
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {text && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{text}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function IconBtn({ icon: Icon, label, onClick, disabled, danger }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-30",
        danger ? "hover:text-sun-600" : "hover:text-slate-900",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

/** Các màn xem trước (tab) — bấm vào 1 nhóm ô bên trái → tự chuyển đến màn nơi nhóm đó hiện rõ nhất */
const VIEWS = [
  {
    key: "header",
    label: "Đầu trang",
    icon: PanelTop,
    path: "/",
    note: "Thanh trên cùng của mọi trang (máy tính).",
  },
  {
    key: "footer",
    label: "Chân trang",
    icon: PanelBottom,
    path: "/",
    note: "Cột Liên hệ và dòng cuối ở chân mọi trang.",
  },
  {
    key: "contact",
    label: "Liên hệ",
    icon: Contact,
    path: "/contact",
    note: "Khối “liên hệ trực tiếp” trên trang Liên hệ.",
  },
  {
    key: "chat",
    label: "Nút chat",
    icon: MessageCircle,
    path: "/",
    note: "Nút chat nổi góc phải mọi trang, khi khách bấm mở.",
  },
  {
    key: "email",
    label: "Email",
    icon: Mail,
    path: null,
    note: "Chân email xác nhận gửi cho khách.",
  },
];
/** Nhóm ô bên trái → màn xem trước tương ứng */
const GROUP_VIEW = {
  company: "footer",
  phones: "chat",
  email: "header",
  social: "contact",
  hours: "contact",
};

const CHAT = {
  en: {
    greeting: "Hi there! 👋 Need help planning your Vietnam trip?",
    hotline: "Hotline",
    wechat: "WeChat",
  },
  zh: { greeting: "您好！👋 需要帮您规划越南之旅吗？", hotline: "热线", wechat: "微信" },
  vi: {
    greeting: "Xin chào! 👋 Bạn cần tư vấn chuyến đi Việt Nam?",
    hotline: "Hotline",
    wechat: "WeChat",
  },
};
const MAIL = {
  en: {
    thanks: "Thank you — we have received your request.",
    reply: "Our team will reply within 24 hours.",
    wa: "Chat on WhatsApp",
  },
  zh: {
    thanks: "感谢您！我们已收到您的需求。",
    reply: "我们的团队将在24小时内回复。",
    wa: "WhatsApp 咨询",
  },
  vi: {
    thanks: "Cảm ơn bạn — chúng tôi đã nhận được yêu cầu.",
    reply: "Đội ngũ sẽ trả lời trong vòng 24 giờ.",
    wa: "Chat qua WhatsApp",
  },
};

/** Khung xem trước: dính khi cuộn (máy tính), giống 1 cửa sổ trình duyệt; tab chọn màn */
function PreviewPanel({ view, lang, active, onPick }) {
  const v = VIEWS.find((x) => x.key === active) ?? VIEWS[0];
  return (
    <div className="overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <Eye className="size-4 text-brand-600" />
        <p className="text-sm font-semibold text-slate-800">Xem trước trên website</p>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
          {LANGS.find((l) => l.key === lang)?.label}
        </span>
      </div>
      <div
        role="tablist"
        aria-label="Chọn phần xem trước"
        className="grid grid-cols-5 gap-1 border-b border-slate-200 bg-white p-1.5"
      >
        {VIEWS.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={x.key === v.key}
            onClick={() => onPick(x.key)}
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[11px] leading-none font-semibold transition",
              x.key === v.key
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
            )}
          >
            <x.icon className="size-4" />
            <span className="max-w-full text-center leading-tight">{x.label}</span>
          </button>
        ))}
      </div>
      <div className="p-3 sm:p-4">
        <div className="overflow-hidden rounded-xl bg-white shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] ring-1 ring-slate-200">
          <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-3 py-2">
            <span className="size-2 rounded-full bg-[#ff5f57]" />
            <span className="size-2 rounded-full bg-[#febc2e]" />
            <span className="size-2 rounded-full bg-[#28c840]" />
            <span className="ml-2 min-w-0 flex-1 truncate rounded-md bg-white px-2 py-0.5 text-[10.5px] text-slate-500 ring-1 ring-slate-200">
              {v.path === null
                ? "Hộp thư của khách"
                : `vietlooktravel.com${lang === "en" ? "" : `/${lang}`}${v.path === "/" ? "" : v.path}`}
            </span>
          </div>
          <div className="max-h-[calc(100svh-19rem)] min-h-[22rem] [scrollbar-width:thin] overflow-y-auto font-sans">
            {v.key === "header" && <HeaderView view={view} lang={lang} />}
            {v.key === "footer" && <FooterView view={view} lang={lang} />}
            {v.key === "contact" && <ContactView view={view} lang={lang} />}
            {v.key === "chat" && <ChatView view={view} lang={lang} />}
            {v.key === "email" && <EmailView view={view} lang={lang} />}
          </div>
        </div>
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-slate-500">
          {v.note} Bấm vào một ô cần sửa, bản xem trước tự chuyển đến chỗ ô đó hiện.
        </p>
      </div>
    </div>
  );
}

const trOf = (lang) => (v) => (typeof v === "string" ? v : v?.[lang] || v?.en || "");

/** Thanh trên cùng + thanh logo + 1 đoạn banner mờ (giống đầu trang thật) */
function HeaderView({ view, lang }) {
  const t = UI[lang];
  const { contact } = view;
  return (
    <div>
      <div className="bg-brand-950 px-3 py-2 text-[11px] text-white/85">
        <p className="truncate font-medium tracking-wide">{t.dmc}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1">
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Phone className="size-3" /> {contact.hotline || "—"}
          </span>
          <span className="flex min-w-0 items-center gap-1">
            <Mail className="size-3 shrink-0" />
            <span className="truncate">{contact.email || "—"}</span>
          </span>
          <span className="flex items-center gap-1 font-semibold whitespace-nowrap text-amber-brand">
            <Handshake className="size-3" /> {t.partners}
          </span>
          <span className="rounded-full bg-sun-500 px-2 py-px font-semibold whitespace-nowrap text-white">
            {t.plan}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-3 py-2.5">
        <Image
          src="/images/logo/vietlook-icon.png"
          alt=""
          width={28}
          height={28}
          className="size-7 rounded-full"
        />
        <span className="text-[13px] font-extrabold tracking-tight text-brand-800 uppercase">
          Vietlook Travel
        </span>
        <span className="ml-auto flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-1.5 w-8 rounded-full bg-slate-200" />
          ))}
        </span>
      </div>
      <div className="relative h-44 bg-[linear-gradient(135deg,#0f3d5c,#1d6a8a_55%,#2f8f7a)]">
        <div className="absolute inset-x-4 bottom-5 space-y-2">
          <span className="block h-3 w-3/4 rounded-full bg-white/80" />
          <span className="block h-2 w-1/2 rounded-full bg-white/50" />
          <span className="mt-3 block h-6 w-28 rounded-full bg-sun-500/90" />
        </div>
      </div>
      <div className="space-y-2 p-4">
        <span className="block h-2 w-2/3 rounded-full bg-slate-100" />
        <span className="block h-2 w-1/2 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

/** Chân trang: cột Liên hệ + dòng bản quyền (mã số doanh nghiệp, giấy phép) */
function FooterView({ view, lang }) {
  const t = UI[lang];
  const tr = trOf(lang);
  const { contact, messaging } = view;
  return (
    <div className="bg-[linear-gradient(115deg,#fffaf1_0%,#fbf7f0_38%,#eaf5fc_100%)] p-4 text-ink/75">
      <h4 className="relative mb-3.5 pb-2 text-sm font-bold tracking-wide text-brand-700 uppercase after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-7 after:rounded-full after:bg-sun-500">
        {t.contact}
      </h4>
      <ul className="space-y-3 text-[12.5px] leading-relaxed">
        <li className="flex gap-2.5">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-sun-500" />
          <span>{tr(contact.address)}</span>
        </li>
        <li className="flex gap-2.5">
          <Phone className="mt-0.5 size-3.5 shrink-0 text-sun-500" />
          <span>
            {contact.phones.map((p, i) => (
              <span key={i} className={cn("block", i && "mt-1.5")}>
                <span className="font-semibold text-ink">{p.number || "—"}</span>
                <span className="block text-[11px] text-muted">{tr(p.channels)}</span>
              </span>
            ))}
          </span>
        </li>
        <li className="flex gap-2.5">
          <Mail className="mt-0.5 size-3.5 shrink-0 text-sun-500" />
          <span className="break-all">{contact.email}</span>
        </li>
        <li className="flex gap-2.5">
          <WeChatIcon className="mt-0.5 size-3.5 shrink-0 text-sun-500" />
          <span>
            {lang === "zh" ? "微信号" : "WeChat ID"}: {messaging.wechatId}
          </span>
        </li>
      </ul>
      <div className="mt-4 border-t border-brand-200/60 pt-3 text-[10.5px] leading-snug text-muted">
        © 2009–2026 {view.legalName}
        {view.legal.businessNo && <> · MST: {view.legal.businessNo}</>}
        {view.legal.licenceNo && <> · GP: {view.legal.licenceNo}</>}
      </div>
    </div>
  );
}

/** Trang Liên hệ: các kênh liên hệ trực tiếp + giờ làm việc + văn phòng */
function ContactView({ view, lang }) {
  const t = UI[lang];
  const tr = trOf(lang);
  const { contact, messaging, social } = view;
  const lineValues = [messaging.lineId, ...messaging.linePhones].filter(Boolean);
  const channels = [
    ...contact.phones
      .filter((p) => p.whatsapp)
      .map((p) => ({
        icon: WhatsAppIcon,
        color: "text-[#25d366]",
        title: p.number,
        sub: "WhatsApp",
        go: 1,
      })),
    {
      icon: WeChatIcon,
      color: "text-[#07c160]",
      title: messaging.wechatId,
      sub: t.wechat,
      copy: 1,
    },
    lineValues.length > 0 && { icon: LineIcon, title: lineValues.join(" · "), sub: "LINE" },
    messaging.zalo && {
      icon: ZaloIcon,
      title: contact.phones.find((p) => p.zalo)?.number,
      sub: "Zalo",
      go: 1,
    },
    {
      icon: FacebookIcon,
      color: "text-[#1877f2]",
      title: "Facebook",
      sub: social.facebookHandle,
      go: 1,
    },
  ].filter(Boolean);
  return (
    <div className="space-y-3 bg-[#e6f4ef] p-3">
      {channels.map((ch, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-border"
        >
          <ch.icon className={cn("size-5 shrink-0", ch.color)} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-ink">{ch.title}</span>
            <span className="text-[11px] text-muted">{ch.sub}</span>
          </span>
          {ch.go && <ChevronRight className="size-4 text-muted" />}
          {ch.copy && <Copy className="size-3.5 text-muted" />}
        </div>
      ))}
      <div className="flex gap-2 rounded-lg bg-white/70 px-3 py-2 text-[11.5px] text-ink/80">
        <Clock className="mt-0.5 size-3.5 shrink-0 text-sun-500" />
        {tr(contact.hours)}
      </div>
      <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-border">
        <p className="text-xs font-bold text-ink">{view.legalName}</p>
        <p className="mt-1 flex gap-1.5 text-[11.5px] leading-relaxed text-ink/75">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-sun-500" />
          {tr(contact.address)}
        </p>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
          <GoogleMapsIcon className="size-3.5" /> Google Maps
        </span>
      </div>
    </div>
  );
}

/** Nút chat nổi khi mở: lời chào + các nút kênh (giống components/layout/FloatingContact.js) */
function ChatView({ view, lang }) {
  const c = CHAT[lang];
  const { contact, messaging } = view;
  const lineValues = [messaging.lineId, ...messaging.linePhones].filter(Boolean);
  const items = [
    messaging.whatsapp && {
      key: "wa",
      label: "WhatsApp",
      icon: WhatsAppIcon,
      color: "bg-[#25d366]",
    },
    messaging.wechatId && { key: "wc", label: c.wechat, icon: WeChatIcon, color: "bg-[#07c160]" },
    lineValues.length > 0 && {
      key: "line",
      label: "LINE",
      icon: LineIcon,
      color: "bg-[#06c755]",
      big: 1,
    },
    messaging.zalo && { key: "zalo", label: "Zalo", icon: ZaloIcon, color: "bg-[#0068ff]", big: 1 },
    { key: "tel", label: `${c.hotline} ${contact.hotline}`, icon: Phone, color: "bg-sun-500" },
  ].filter(Boolean);
  return (
    <div className="relative flex min-h-[22rem] flex-col justify-end bg-[linear-gradient(180deg,#f8fafc,#eef4f8)] p-4">
      <div className="pointer-events-none absolute inset-x-4 top-4 space-y-2 opacity-60">
        <span className="block h-24 rounded-xl bg-slate-200/70" />
        <span className="block h-2 w-2/3 rounded-full bg-slate-200" />
        <span className="block h-2 w-1/2 rounded-full bg-slate-200" />
      </div>
      <div className="relative ml-auto flex flex-col items-end gap-2">
        <div className="mb-1 max-w-[15rem] rounded-2xl rounded-br-md bg-white px-3.5 py-2.5 text-left text-[12.5px] leading-snug font-medium text-ink shadow-lg ring-1 ring-border">
          {c.greeting}
        </div>
        {items.map((it) => (
          <span key={it.key} className="flex items-center gap-2">
            <span className="rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap text-ink shadow-md">
              {it.label}
            </span>
            <span
              className={cn(
                "grid size-9 place-items-center rounded-full text-white shadow-lg",
                it.color,
              )}
            >
              <it.icon className={it.big ? "size-7" : "size-[18px]"} />
            </span>
          </span>
        ))}
        <span className="mt-1 grid size-11 place-items-center rounded-full bg-brand-600 text-white shadow-xl shadow-brand-900/30">
          <MessageCircle className="size-5" />
        </span>
      </div>
    </div>
  );
}

/** Email xác nhận gửi khách: thân thư rút gọn + chân thư (tên công ty, địa chỉ, hotline, email, nút WhatsApp) */
function EmailView({ view, lang }) {
  const m = MAIL[lang];
  const tr = trOf(lang);
  const { contact, messaging } = view;
  const company = lang === "vi" ? view.legalNameVi || view.legalName : view.legalName;
  return (
    <div className="bg-[#f2f5f8] p-4">
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Image
            src="/images/logo/vietlook-icon.png"
            alt=""
            width={24}
            height={24}
            className="size-6 rounded-full"
          />
          <span className="text-[12px] font-extrabold tracking-tight text-brand-800 uppercase">
            Vietlook Travel
          </span>
        </div>
        <div className="space-y-2 px-4 py-4">
          <p className="text-[13px] font-bold text-ink">{m.thanks}</p>
          <p className="text-[12px] text-muted">{m.reply}</p>
          <span className="block h-2 w-5/6 rounded-full bg-slate-100" />
          <span className="block h-2 w-2/3 rounded-full bg-slate-100" />
          {messaging.whatsapp && (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#25d366] px-3 py-1.5 text-[11.5px] font-semibold text-white">
              <WhatsAppIcon className="size-3.5" /> {m.wa}
            </span>
          )}
        </div>
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-[11px] leading-relaxed text-muted">
          <b className="text-ink/80">{company}</b>
          <br />
          {tr(contact.address)}
          <br />
          {contact.hotline} · {contact.email}
        </div>
      </div>
    </div>
  );
}
