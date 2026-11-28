import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PAGE_KEYS } from "../src/constants/content.js";
import {
  PAGE_COPY_KEYS,
  PAGE_COPY_SCHEMA,
  PAGE_COPY_SEO_KEYS,
} from "../src/constants/page-copy.js";
import { auditLogRepository } from "../src/repositories/audit-log.repository.js";
import { pageRepository } from "../src/repositories/content.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { compactPageCopy } from "../src/services/modules.service.js";
import { signAccessToken } from "../src/services/token.service.js";
import { PAGE_COPY_VALIDATORS, pageCopySchema } from "../src/validators/page-copy.validator.js";

/**
 * Giao diện các trang công khai (CMS → Giao diện trang): khai báo ô 2 bên khớp nhau, kiểm tra dữ liệu,
 * nội dung mặc định, phân quyền + đường dẫn — không cần MongoDB thật (thay repository).
 */

const FE = new URL("../../fe/src/", import.meta.url);
const { PAGE_COPY } = await import(new URL("lib/page-copy/registry.mjs", FE));
const R = await import(new URL("lib/page-copy/resolve.mjs", FE));
/** File dữ liệu của website (ESM không có import) — nạp qua data: URL để Node không cảnh báo kiểu module */
const loadFe = async (path) => {
  const src = await readFile(new URL(path, FE), "utf8");
  return import(`data:text/javascript;charset=utf-8,${encodeURIComponent(src)}`);
};
const LANGS = ["en", "zh", "vi"];
const dicts = Object.fromEntries(
  await Promise.all(
    LANGS.map(async (l) => [l, (await loadFe(`i18n/dictionaries/${l}.js`)).default]),
  ),
);
const DATA = { visa: await loadFe("data/visa.js"), regions: await loadFe("data/regions.js") };

const CDN = "https://res.cloudinary.com/demo/image/upload/v1/vietlook/pages/abc.webp";
const parse = (key, data) => PAGE_COPY_VALIDATORS[key].safeParse({ data });

/** Khai báo của website → chỉ phần máy chủ cần (kiểu, max, count) */
const project = (spec) =>
  spec.type === "list"
    ? {
        type: "list",
        count: spec.count,
        item: spec.item.type
          ? project(spec.item)
          : Object.fromEntries(Object.entries(spec.item).map(([k, s]) => [k, project(s)])),
      }
    : spec.type === "image"
      ? { type: "image" }
      : { type: spec.type, max: spec.max };

describe("giao diện trang — khai báo ô", () => {
  it("website (registry.mjs) và máy chủ (constants/page-copy.js) khai báo giống hệt nhau", () => {
    // so tập khoá (không so thứ tự): nhiều nhóm trang được thêm song song, thứ tự gộp có thể khác nhau
    const sorted = (keys) => [...keys].sort();
    assert.deepEqual(sorted(Object.keys(PAGE_COPY)), sorted(PAGE_COPY_KEYS));
    for (const key of PAGE_COPY_KEYS) {
      // thứ tự ô trong 1 trang cũng không quan trọng — chỉ cần đủ ô, đúng kiểu / max / count từng ô
      assert.deepEqual(
        sorted(Object.keys(PAGE_COPY[key].fields)),
        sorted(Object.keys(PAGE_COPY_SCHEMA[key])),
        `trang ${key} lệch danh sách ô`,
      );
      const fe = Object.fromEntries(
        Object.entries(PAGE_COPY[key].fields).map(([k, s]) => [k, project(s)]),
      );
      assert.deepEqual(fe, PAGE_COPY_SCHEMA[key], `trang ${key} lệch khai báo`);
    }
  });

  it("trang sửa được “Hiển thị trên Google”: website (seo: true) và máy chủ khớp nhau", () => {
    const fe = PAGE_COPY_KEYS.filter((k) => PAGE_COPY[k].seo === true).sort();
    assert.deepEqual(fe, [...PAGE_COPY_SEO_KEYS].sort());
    for (const k of PAGE_COPY_SEO_KEYS) assert.ok(PAGE_COPY_KEYS.includes(k), k);
    // khối dùng chung / trang không lập chỉ mục không có phần Google
    for (const k of ["global", "detail", "access", "not-found", "thank-you"])
      assert.equal(PAGE_COPY_SEO_KEYS.includes(k), false, k);
  });

  it("khoá trang không trùng trang giới thiệu / chính sách; đủ tên, đường dẫn, nhãn tiếng Việt", () => {
    for (const key of PAGE_COPY_KEYS) {
      assert.ok(!PAGE_KEYS.includes(key), key);
      assert.match(key, /^[a-z0-9-]+$/);
      const e = PAGE_COPY[key];
      assert.ok(e.name && e.group && e.path.startsWith("/") && e.summary, key);
      const labels = (spec) => {
        assert.ok(spec.label, `${key}: thiếu nhãn`);
        if (spec.type === "list")
          (spec.item.type ? [spec.item] : Object.values(spec.item)).forEach(labels);
      };
      Object.values(e.fields).forEach(labels);
      // trang không có ảnh nào (vd. Trang cảm ơn) → bỏ `thumb`, thẻ CMS chỉ hiện biểu tượng
      if (e.thumb)
        assert.ok(R.specAt(e, e.thumb)?.type === "image", `${key}: ảnh đại diện phải là ô ảnh`);
    }
  });

  it("mọi nguồn mặc định có chữ / ảnh ở cả 3 ngôn ngữ (không có ô trống trên website)", () => {
    for (const key of PAGE_COPY_KEYS) {
      for (const l of LANGS) {
        const defs = R.pageDefaults(PAGE_COPY[key], { dict: dicts[l], data: DATA }, l);
        // ô `optional` (vd. dòng nhỏ dưới nút khối không rào cản) được phép để trống: trống = website không hiện
        for (const [k, spec] of Object.entries(PAGE_COPY[key].fields))
          if (spec.optional) delete defs[k];
        const empty = [];
        const visit = (v, path) => {
          if (typeof v === "string") return void (v.trim() || empty.push(path));
          if (Array.isArray(v)) return v.forEach((x, i) => visit(x, `${path}.${i}`));
          Object.entries(v).forEach(([k, x]) => visit(x, `${path}.${k}`));
        };
        visit(defs, key);
        assert.deepEqual(empty, [], `${key} (${l}) có ô mặc định trống`);
      }
    }
  });

  it("ảnh mặc định là ảnh có sẵn của website (máy chủ chấp nhận khi lưu lại)", () => {
    for (const key of PAGE_COPY_KEYS) {
      const defs = R.pageDefaults(PAGE_COPY[key], { dict: dicts.en, data: DATA }, "en");
      const data = {};
      for (const [k, spec] of Object.entries(PAGE_COPY[key].fields)) {
        if (spec.type === "image") data[k] = defs[k];
        if (spec.type === "list" && spec.item.type === "image") data[k] = defs[k];
      }
      assert.equal(parse(key, data).success, true, key);
    }
  });
});

describe("giao diện trang — kiểm tra dữ liệu", () => {
  it("không gửi gì → hợp lệ, dữ liệu rỗng (website dùng mặc định)", () => {
    for (const key of PAGE_COPY_KEYS) assert.deepEqual(parse(key, undefined).data.data, {});
    assert.equal(pageCopySchema("khong-co"), null);
  });

  it("chữ thuần: bỏ thẻ HTML / ký tự điều khiển; 1 dòng gộp xuống dòng, đoạn văn giữ xuống dòng", () => {
    const r = parse("car-rental", {
      heroTitle: { en: "<b>Private</b>\n car  <script>x</script>", vi: "Xe < 5 chỗ & tài xế" },
      heroText: { en: "Line 1  \r\n\r\n\r\n\r\nLine 2\u0007" },
    });
    assert.equal(r.success, true);
    assert.equal(r.data.data.heroTitle.en, "Private car x");
    assert.equal(r.data.data.heroTitle.vi, "Xe < 5 chỗ & tài xế"); // không mã hoá &amp; / &lt;
    assert.equal(r.data.data.heroTitle.zh, "");
    assert.equal(r.data.data.heroText.en, "Line 1\n\nLine 2");
  });

  it("bỏ ô lạ, ngôn ngữ lạ; quá độ dài → lỗi tiếng Việt", () => {
    const r = parse("car-rental", { hacker: { en: "x" }, heroTitle: { en: "a", fr: "b" } });
    assert.equal(r.success, true);
    assert.equal(r.data.data.hacker, undefined);
    assert.deepEqual(r.data.data.heroTitle, { en: "a", zh: "", vi: "" });
    const long = parse("car-rental", { heroEyebrow: { vi: "x".repeat(81) } });
    assert.equal(long.success, false);
    assert.match(long.error.issues[0].message, /Tối đa 80 ký tự/);
  });

  it("danh sách không vượt số phần tử; ô con đúng kiểu", () => {
    assert.equal(parse("car-rental", { perks: Array(3).fill({ en: "x" }) }).success, true);
    assert.equal(parse("car-rental", { perks: Array(4).fill({ en: "x" }) }).success, false);
    assert.equal(parse("visa-fast-track", { faq: Array(5).fill({}) }).success, false);
    const r = parse("visa-fast-track", { terms: [{}, { meaning: { vi: "Giải thích" }, x: 1 }] });
    assert.equal(r.success, true);
    assert.equal(r.data.data.terms[1].meaning.vi, "Giải thích");
    assert.equal(r.data.data.terms[1].x, undefined);
  });

  it("ảnh: chỉ kho ảnh Cloudinary của website hoặc ảnh có sẵn /images/…", () => {
    const ok = (v) => parse("car-rental", { heroImage: v }).success;
    assert.equal(ok(CDN), true);
    assert.equal(ok("/images/cars/luxury-v3a.webp"), true);
    assert.equal(ok(""), true);
    for (const bad of [
      "https://evil.example/x.jpg",
      "javascript:alert(1)",
      "data:image/png;base64,AAAA",
      "/images/../../etc/passwd.jpg",
      "//evil.example/x.jpg",
    ])
      assert.equal(ok(bad), false, bad);
    assert.equal(parse("visa-fast-track", { heroImages: ["", CDN] }).success, true);
    assert.equal(parse("visa-fast-track", { heroImages: ["https://x.y/z.jpg"] }).success, false);
  });

  it("lưu gọn: bỏ ô trống, giữ vị trí trong danh sách, bỏ phần trống cuối", () => {
    const { data } = parse("car-rental", {
      heroTitle: {},
      heroText: { vi: "Mới" },
      heroImage: "",
      services: [{}, { text: { en: "New" } }, {}, {}],
      perks: [{}, {}],
    }).data;
    assert.deepEqual(compactPageCopy(data, PAGE_COPY_SCHEMA["car-rental"]), {
      heroText: { en: "", zh: "", vi: "Mới" },
      services: [{}, { text: { en: "New", zh: "", vi: "" } }],
    });
  });
});

describe("giao diện trang — nội dung mặc định & bản đã sửa", () => {
  const entry = PAGE_COPY["car-rental"];
  const ctx = (l) => ({ dict: dicts[l], data: DATA });
  const defsByLang = Object.fromEntries(LANGS.map((l) => [l, R.pageDefaults(entry, ctx(l), l)]));

  it("chưa sửa gì → y hệt chữ trong từ điển (trang hiện như cũ)", () => {
    const p = R.resolvePage(entry, {}, ctx("en"), "en");
    assert.equal(p.heroTitle, dicts.en.car.title);
    assert.equal(p.trust[2].title, dicts.en.car.trust[2].t);
    assert.equal(p.faq[4].a, dicts.en.car.faq[4].a);
    assert.equal(p.heroImage, "/images/heroes/car-ha-giang-road.webp");
    const v = R.resolvePage(PAGE_COPY["visa-fast-track"], {}, ctx("zh"), "zh");
    assert.equal(v.faq[0].q, DATA.visa.visaFaq.zh[0].q);
    assert.equal(v.terms[3].meaning, DATA.visa.visaTerms[3].def.zh);
    assert.equal(v.notes[1], DATA.visa.visaNotes[1].zh);
  });

  it("ô đã sửa đè đúng ngôn ngữ; ngôn ngữ còn trống vẫn dùng mặc định", () => {
    const data = {
      heroTitle: { vi: "Thuê xe riêng" },
      heroImage: CDN,
      faq: [{}, { q: { en: "Q?" } }],
    };
    const vi = R.resolvePage(entry, data, ctx("vi"), "vi");
    const en = R.resolvePage(entry, data, ctx("en"), "en");
    assert.equal(vi.heroTitle, "Thuê xe riêng");
    assert.equal(en.heroTitle, dicts.en.car.title);
    assert.equal(en.faq[1].q, "Q?");
    assert.equal(en.faq[0].q, dicts.en.car.faq[0].q);
    assert.equal(vi.heroImage, CDN);
    assert.equal(R.pick(data, "heroTitle", "vi", "x"), "Thuê xe riêng");
    assert.equal(R.pick(data, "heroTitle", "en", "x"), "x");
    assert.equal(R.countEdited(entry, data), 3);
  });

  it("chữ chung trang chi tiết: chưa sửa → y hệt từ điển (giữ {name} để website tự điền)", () => {
    const detail = PAGE_COPY.detail;
    for (const l of LANGS) {
      const p = R.resolvePage(detail, {}, ctx(l), l);
      assert.equal(p.themeEmptyTitle, dicts[l].theme.emptyTitle);
      assert.equal(p.destBestTours, dicts[l].destination.bestTours);
      assert.match(p.destBestTours, /\{name\}/);
      assert.equal(p.adviceCta, dicts[l].tours.notSureCta);
      assert.equal(p.guideEbookButton, dicts[l].nav.planTrip);
      assert.equal(p.tourAccessBadge, dicts[l].access.badge);
      assert.equal(p.tourContactTeam, dicts[l].tour.contactTeam);
    }
    // ảnh trang trí thẻ (trang không có ô ảnh) phải là ảnh có sẵn của website
    for (const key of PAGE_COPY_KEYS)
      if (PAGE_COPY[key].cover) assert.match(PAGE_COPY[key].cover, /^\/images\/[\w/.-]+$/, key);
  });

  it("khối không rào cản (dùng chung): chưa sửa → y hệt từ điển; dòng nhỏ dưới nút mặc định trống", () => {
    const access = PAGE_COPY.access;
    assert.equal(access.group, PAGE_COPY.global.group);
    for (const l of LANGS) {
      const p = R.resolvePage(access, {}, ctx(l), l);
      const a = dicts[l].access;
      assert.equal(p.title, a.title);
      assert.equal(p.text, a.text);
      assert.equal(p.cta, a.cta);
      assert.equal(p.bandText, a.badgeLong);
      assert.equal(p.note, "");
      assert.deepEqual(p.points, a.points);
    }
    const p = R.resolvePage(
      access,
      { note: { vi: "Gọi hotline để được tư vấn" } },
      ctx("vi"),
      "vi",
    );
    assert.equal(p.note, "Gọi hotline để được tư vấn");
    assert.equal(parse("access", { note: { vi: "x".repeat(201) } }).success, false);
  });

  it("CMS: điền sẵn mặc định rồi lưu lại không đổi gì → không lưu ô nào", () => {
    const state = R.fillPage(entry, {}, defsByLang);
    assert.equal(state.heroTitle.zh, dicts.zh.car.title);
    assert.deepEqual(R.stripPage(entry, state, defsByLang), {});
    state.services[1].text.vi = "  Mô tả mới\r\n";
    state.heroImage = CDN;
    const body = R.stripPage(entry, state, defsByLang);
    assert.deepEqual(body, {
      heroImage: CDN,
      services: [{}, { text: { en: "", zh: "", vi: "Mô tả mới" } }],
    });
    assert.equal(parse("car-rental", body).success, true);
  });
});

describe("giao diện trang — đường dẫn & phân quyền", () => {
  const app = createApp();
  const saved = [];
  const stub = (obj, name, fn) => {
    saved.push([obj, name, obj[name]]);
    obj[name] = fn;
  };
  const ID = { viewer: "64b7f0c2a1b2c3d4e5f6e001", editor: "64b7f0c2a1b2c3d4e5f6e002" };
  const users = {
    [ID.viewer]: {
      _id: ID.viewer,
      username: "viewer",
      role: "editor",
      isActive: true,
      tokenVersion: 0,
      permissions: { pages: "view" },
    },
    [ID.editor]: {
      _id: ID.editor,
      username: "editor",
      role: "editor",
      isActive: true,
      tokenVersion: 0,
      permissions: { pages: "edit" },
    },
  };
  const store = {};
  let lastFilter;
  before(() => {
    stub(userRepository, "findById", async (id) => users[String(id)] ?? null);
    stub(auditLogRepository, "create", async () => ({}));
    stub(pageRepository, "findByIdent", async (key) => store[key] ?? null);
    stub(pageRepository, "upsertByIdent", async (key, doc) => {
      store[key] = { ...doc, updatedAt: new Date("2026-11-25T00:00:00Z") };
      return store[key];
    });
    stub(pageRepository, "listActive", async (args) => {
      lastFilter = args.filter;
      return [];
    });
  });
  after(() => {
    for (const [obj, name, fn] of saved.reverse()) obj[name] = fn;
  });
  const call = (id, method, path, body) => {
    const agent = request(app);
    const r = agent[method](`/api/v1${path}`).set("Cookie", `vl_at=${signAccessToken(users[id])}`);
    if (method !== "get") r.set("X-Requested-With", "fetch");
    return body === undefined ? r : r.send(body);
  };

  it("website: trang chưa lưu → {}; khoá lạ → 404", async () => {
    const res = await request(app).get("/api/v1/public/page-copy/car-rental");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, {});
    assert.equal((await request(app).get("/api/v1/public/page-copy/about")).status, 404);
    assert.equal((await request(app).get("/api/v1/public/page-copy/__proto__")).status, 404);
  });

  it("website: danh sách trang giới thiệu / chính sách không lẫn bản giao diện trang", async () => {
    await request(app).get("/api/v1/public/pages");
    assert.ok(lastFilter?.key, "phải lọc theo khoá");
    assert.equal(JSON.stringify(lastFilter.key).includes("car-rental"), false);
  });

  it("chỉ xem: đọc được, lưu bị chặn; có quyền sửa: lưu gọn, dữ liệu sai → 422", async () => {
    assert.equal((await call(ID.viewer, "get", "/settings/page-copy/car-rental")).status, 200);
    const body = { data: { heroTitle: { vi: "Xe riêng" } } };
    assert.equal(
      (await call(ID.viewer, "put", "/settings/page-copy/car-rental", body)).status,
      403,
    );

    const ok = await call(ID.editor, "put", "/settings/page-copy/car-rental", body);
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.body.data.data, { heroTitle: { en: "", zh: "", vi: "Xe riêng" } });
    assert.equal(store["car-rental"].key, "car-rental");

    const pub = await request(app).get("/api/v1/public/page-copy/car-rental");
    assert.equal(pub.body.data.heroTitle.vi, "Xe riêng");

    const bad = await call(ID.editor, "put", "/settings/page-copy/car-rental", {
      data: { heroImage: "https://evil.example/x.jpg" },
    });
    assert.equal(bad.status, 422);
    assert.equal((await call(ID.editor, "put", "/settings/page-copy/terms", body)).status, 404);
  });
});
