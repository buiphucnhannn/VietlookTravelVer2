/**
 * Sinh src/data/generated/route-slugs.json – danh sách slug hợp lệ của các route động.
 * proxy.js dùng file này để trả 404 THẬT cho slug không tồn tại (tài liệu yêu cầu mục 3),
 * vì với cacheComponents trang render trong <Suspense> nên notFound() đến sau khi đã gửi mã 200.
 * Tự chạy trước `next build` (npm "prebuild"); chạy tay: node scripts/route-slugs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const load = (p) => import(pathToFileURL(path.join(root, p)).href);
const json = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));

const { destinations, regions } = await load("src/data/destinations.js");
const { themes } = await load("src/data/themes.js");
const { policies } = await load("src/data/company.js");
const { guideCategories } = await load("src/data/guide-categories.js");
const { authoredPosts } = await load("src/data/guides-authored.js");

const toursRaw = json("src/data/generated/tours.json");
const tours = Array.isArray(toursRaw) ? toursRaw : toursRaw.tours;
const postsRaw = json("src/data/generated/posts.json");
const posts = Array.isArray(postsRaw) ? postsRaw : postsRaw.posts || Object.values(postsRaw);

// tác giả: lấy từ khoá của object `authors` trong posts.js (không import vì posts.js import JSON)
const postsSrc = fs.readFileSync(path.join(root, "src/data/posts.js"), "utf8");
const authorsBlock = postsSrc.slice(postsSrc.indexOf("export const authors"));
const authors = [
  ...authorsBlock.slice(0, authorsBlock.indexOf("\n};")).matchAll(/^ {2}"?([a-z0-9-]+)"?: \{/gm),
].map((m) => m[1]);

const out = {
  tours: tours.map((t) => t.slug),
  destinations: [...regions, ...destinations].map((d) => d.slug),
  policies: Object.keys(policies),
  themes: themes.map((t) => t.slug),
  "travel-guide": [...posts, ...authoredPosts].map((p) => p.slug),
  "travel-guide/category": guideCategories.map((c) => c.slug),
  "travel-guide/author": authors,
};
fs.writeFileSync(path.join(root, "src/data/generated/route-slugs.json"), JSON.stringify(out));
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])));
