import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createTranslator } from "../src/services/translate.service.js";

// ---- fetch giả: mỗi dịch vụ 1 hàm xử lý; ghi lại dịch vụ nào đã bị gọi
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const captcha = () =>
  new Response("<HTML><TITLE>302 Moved</TITLE></HTML>", {
    status: 302,
    headers: { Location: "https://www.google.com/sorry/index" },
  });

function which(url) {
  const u = new URL(url);
  if (u.hostname === "api.cognitive.microsofttranslator.com") return "azure";
  if (u.hostname.endsWith("deepl.com"))
    return u.pathname.includes("languages") ? "deepl-langs" : "deepl";
  if (u.hostname === "translation.googleapis.com") return "google-cloud";
  if (u.hostname === "translate.googleapis.com") return "google";
  if (u.hostname === "clients5.google.com") return "google-dict";
  if (u.hostname === "api.mymemory.translated.net") return "mymemory";
  if (u.hostname.startsWith("lt.")) return "libretranslate";
  return "lingva";
}

/** "bản dịch" giả: [đích] + câu gốc → dễ kiểm tra */
const fake = (to, s) => `[${to}] ${s}`;

/** Trả lời đúng định dạng của từng dịch vụ */
const ok = {
  async azure(url, init) {
    const to = new URL(url).searchParams.get("to");
    return json(
      JSON.parse(init.body).map((x) => ({ translations: [{ text: fake(to, x.Text), to }] })),
    );
  },
  async deepl(url, init) {
    const b = JSON.parse(init.body);
    return json({ translations: b.text.map((t) => ({ text: fake(b.target_lang, t) })) });
  },
  async "google-cloud"(url, init) {
    const b = JSON.parse(init.body);
    return json({
      data: { translations: b.q.map((t) => ({ translatedText: fake(b.target, t) })) },
    });
  },
  async google(url, init) {
    const tl = new URL(url).searchParams.get("tl");
    const q = new URLSearchParams(init.body).get("q");
    return json([
      [
        [
          q
            .split("\n")
            .map((l) => fake(tl, l))
            .join("\n"),
          q,
        ],
      ],
    ]);
  },
  async "google-dict"(url) {
    const u = new URL(url);
    return json(u.searchParams.getAll("q").map((q) => fake(u.searchParams.get("tl"), q)));
  },
  async lingva(url) {
    const [, , , , to, q] = new URL(url).pathname.split("/");
    return json({ translation: fake(to, decodeURIComponent(q)) });
  },
  async mymemory(url) {
    const u = new URL(url);
    const to = u.searchParams.get("langpair").split("|")[1];
    return json({
      responseStatus: 200,
      responseData: { translatedText: fake(to, u.searchParams.get("q")) },
    });
  },
  async libretranslate(url, init) {
    const b = JSON.parse(init.body);
    return json({ translatedText: b.q.map((t) => fake(b.target, t)) });
  },
};

function setup(cfg = {}, handlers = {}) {
  const calls = [];
  let t = Date.parse("2026-11-11T10:00:00Z");
  const clock = { now: () => t, advance: (ms) => (t += ms) };
  const fetch = async (url, init = {}) => {
    const name = which(String(url));
    calls.push(name);
    const h = handlers[name] ?? ok[name];
    return h(String(url), init);
  };
  const tr = createTranslator({
    fetch,
    now: clock.now,
    log: { warn() {} },
    timeoutMs: 300,
    budgetMs: 1_000,
    ...cfg,
  });
  return { tr, calls, clock };
}

const vi = (texts, to = ["en"]) => ({ from: "vi", to, texts });

describe("dịch tự động: chuỗi dịch vụ", () => {
  it("bỏ qua dịch vụ chưa có key, dùng theo đúng thứ tự cấu hình", async () => {
    const { tr, calls } = setup({
      providers: ["deepl", "google-cloud", "azure", "mymemory"],
      azureKey: "k",
    });
    assert.deepEqual(tr.providers(), ["azure", "mymemory"]);
    const r = await tr.translate(vi(["Xin chào"]));
    assert.deepEqual(r, { en: ["[en] Xin chào"] });
    assert.deepEqual(calls, ["azure"]);
  });

  it("mặc định (không key): chỉ dùng dịch vụ không cần key, MyMemory cuối", () => {
    const { tr } = setup();
    assert.deepEqual(tr.providers(), ["google", "google-dict", "lingva", "mymemory"]);
  });

  it("429 → tạm nghỉ, lần sau bỏ qua ngay; hết thời gian nghỉ → dùng lại", async () => {
    const { tr, calls, clock } = setup(
      { providers: ["azure", "mymemory"], azureKey: "k", cooldownMs: 15 * 60_000 },
      { azure: async () => json({ error: { code: 429001 } }, 429) },
    );
    assert.deepEqual(await tr.translate(vi(["Một"])), { en: ["[en] Một"] });
    assert.deepEqual(calls, ["azure", "mymemory"]);
    calls.length = 0;
    await tr.translate(vi(["Hai"]));
    assert.deepEqual(calls, ["mymemory"]);
    clock.advance(16 * 60_000);
    calls.length = 0;
    await tr.translate(vi(["Ba"]));
    assert.deepEqual(calls, ["azure", "mymemory"]);
  });

  it("Google trả 302 sang trang captcha → bị chặn, không ghi chữ HTML vào nội dung", async () => {
    const { tr, calls } = setup({ providers: ["google", "mymemory"] }, { google: captcha });
    assert.deepEqual(await tr.translate(vi(["Vịnh Hạ Long"])), { en: ["[en] Vịnh Hạ Long"] });
    assert.deepEqual(await tr.translate(vi(["Vịnh Hạ Long"], ["zh"])), {
      zh: ["[zh-CN] Vịnh Hạ Long"],
    });
    assert.deepEqual(calls, ["google", "mymemory", "mymemory"]); // lần 2 bỏ qua Google ngay
  });

  it("phản hồi 200 nhưng là trang HTML / cảnh báo → coi là lỗi, thử dịch vụ sau", async () => {
    const { tr } = setup(
      { providers: ["google-dict", "azure"], azureKey: "k" },
      { "google-dict": async () => json(["<html><title>Just a moment...</title></html>"]) },
    );
    assert.deepEqual(await tr.translate(vi(["Phở"])), { en: ["[en] Phở"] });
  });

  it("MyMemory hết lượt: không bao giờ ghi 'MYMEMORY WARNING' vào nội dung, báo lỗi thân thiện", async () => {
    const warn =
      "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY. NEXT AVAILABLE IN 05 HOURS 10 MINUTES";
    const { tr, calls, clock } = setup(
      { providers: ["mymemory"] },
      {
        mymemory: async () =>
          json({ responseStatus: 429, responseData: { translatedText: warn } }, 429),
      },
    );
    await assert.rejects(
      tr.translate(vi(["Xin chào"])),
      (e) => e.statusCode === 503 && /bận/.test(e.message),
    );
    calls.length = 0;
    await assert.rejects(tr.translate(vi(["Xin chào"])), /bận/);
    assert.deepEqual(calls, []); // đang nghỉ → không gọi
    clock.advance(5 * 3600_000 + 12 * 60_000);
    await assert.rejects(tr.translate(vi(["Xin chào"])));
    assert.deepEqual(calls, ["mymemory"]); // hết giờ nghỉ (theo thông báo) → thử lại
  });

  it("DeepL không hỗ trợ cặp ngôn ngữ → tự bỏ qua cặp đó, cặp khác vẫn dùng", async () => {
    const langs = (url) =>
      json(
        new URL(url).searchParams.get("type") === "source"
          ? [{ language: "EN" }, { language: "ZH" }]
          : [{ language: "EN-US" }, { language: "ZH-HANS" }],
      );
    const { tr, calls } = setup(
      { providers: ["deepl", "mymemory"], deeplKey: "abc:fx" },
      { "deepl-langs": async (url) => langs(url) },
    );
    assert.deepEqual(await tr.translate(vi(["Chào"])), { en: ["[en] Chào"] });
    assert.ok(!calls.includes("deepl"));
    assert.deepEqual(await tr.translate({ from: "en", to: ["zh"], texts: ["Hello"] }), {
      zh: ["[ZH-HANS] Hello"],
    });
    assert.ok(calls.includes("deepl"));
  });

  it("DeepL trả 456 (hết hạn mức) → nghỉ tới ngày UTC hôm sau", async () => {
    const { tr, clock } = setup(
      { providers: ["deepl", "mymemory"], deeplKey: "abc:fx" },
      {
        "deepl-langs": async () =>
          json([{ language: "EN" }, { language: "EN-US" }, { language: "VI" }]),
        deepl: async () => json({ message: "Quota exceeded" }, 456),
      },
    );
    await tr.translate(vi(["Một"]));
    const until = tr.status().find((s) => s.name === "deepl").until;
    assert.equal(clock.now() + until, Date.parse("2026-11-12T00:00:00Z"));
  });

  it("HTML: giữ nguyên thẻ, chỉ dịch chữ, escape bản dịch (không chèn được thẻ)", async () => {
    const { tr } = setup(
      { providers: ["azure"], azureKey: "k" },
      {
        azure: async (url, init) =>
          json(
            JSON.parse(init.body).map((x) => ({
              translations: [
                { text: x.Text === "bạn" ? '<img src=x onerror="a()">' : `EN:${x.Text}` },
              ],
            })),
          ),
      },
    );
    const r = await tr.translate(vi(['<p class="a">Xin <b>chào</b> &amp; vui</p><p>bạn</p>']));
    assert.equal(
      r.en[0],
      '<p class="a">EN:Xin <b>EN:chào</b> EN:&amp; vui</p><p>&lt;img src=x onerror="a()"&gt;</p>',
    );
  });

  it("chia lô theo giới hạn từng dịch vụ (DeepL ≤ 50 đoạn / request)", async () => {
    const { tr, calls } = setup(
      { providers: ["deepl"], deeplKey: "abc:fx" },
      { "deepl-langs": async () => json([{ language: "VI" }, { language: "EN-US" }]) },
    );
    const texts = Array.from({ length: 120 }, (_, i) => `Câu số ${i}`);
    const r = await tr.translate(vi(texts));
    assert.equal(r.en[119], "[EN-US] Câu số 119");
    assert.equal(calls.filter((c) => c === "deepl").length, 3);
  });

  it("xoay vòng dịch vụ không cần key đứng đầu để chia tải", async () => {
    const { tr, calls } = setup({ providers: ["google", "google-dict", "lingva", "mymemory"] });
    const first = [];
    for (const w of ["Một", "Hai", "Ba", "Bốn"]) {
      calls.length = 0;
      await tr.translate(vi([w]));
      first.push(calls[0]);
    }
    assert.deepEqual(first, ["google", "google-dict", "lingva", "google"]);
  });

  it("Lingva: xoay vòng máy chủ, máy chủ lỗi tạm nghỉ riêng", async () => {
    const hosts = [];
    const { tr } = setup(
      { providers: ["lingva"], lingvaInstances: ["https://a.example", "https://b.example"] },
      {
        lingva: async (url) => {
          hosts.push(new URL(url).hostname);
          if (url.startsWith("https://a.example")) return json({ error: "An error occurred" }, 500);
          return ok.lingva(url);
        },
      },
    );
    assert.deepEqual(await tr.translate(vi(["Một"])), { en: ["[en] Một"] });
    assert.deepEqual(await tr.translate(vi(["Hai"])), { en: ["[en] Hai"] });
    assert.deepEqual(hosts, ["a.example", "b.example", "b.example"]);
  });

  it("dịch vụ treo → hết giờ (timeout) rồi chuyển dịch vụ sau", async () => {
    const hang = (url, init) =>
      new Promise((_, reject) =>
        init.signal.addEventListener("abort", () => reject(init.signal.reason)),
      );
    const { tr } = setup(
      { providers: ["azure", "mymemory"], azureKey: "k", timeoutMs: 100, budgetMs: 2_000 },
      { azure: hang },
    );
    assert.deepEqual(await tr.translate(vi(["Chào"])), { en: ["[en] Chào"] });
  });

  it("mọi dịch vụ đều hỏng → lỗi thân thiện ngay, lần sau không gọi mạng", async () => {
    const down = async () => json({ error: "x" }, 429);
    const { tr, calls } = setup(
      { providers: ["azure", "google", "google-dict", "mymemory"], azureKey: "k" },
      { azure: down, google: captcha, "google-dict": captcha, mymemory: down },
    );
    await assert.rejects(
      tr.translate(vi(["Chào"])),
      (e) => e.statusCode === 503 && /thử lại sau/.test(e.message),
    );
    calls.length = 0;
    const t0 = Date.now();
    await assert.rejects(tr.translate(vi(["Chào"])), /bận/);
    assert.deepEqual(calls, []);
    assert.ok(Date.now() - t0 < 100);
  });

  it("dùng bộ nhớ đệm: câu đã dịch không gọi lại dịch vụ", async () => {
    const { tr, calls } = setup({ providers: ["azure"], azureKey: "k" });
    await tr.translate(vi(["Hội An"]));
    await tr.translate(vi(["Hội An"]));
    assert.equal(calls.length, 1);
  });
});
