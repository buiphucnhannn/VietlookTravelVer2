// Cẩm nang du lịch: bài chuyển từ website cũ + bài biên soạn mới.
import migrated from "./generated/posts.json";
import { authoredPosts } from "./guides-authored";

export const authors = {
  "vietlook-team": {
    name: { en: "Vietlook Travel Team", zh: "Vietlook 旅行团队" },
    role: { en: "Local travel experts, Hanoi", zh: "河内本地旅行专家" },
    bio: {
      en: "Our Hanoi-based planners and guides have been designing trips across Vietnam since 2009. Every guide is written from first-hand experience on the ground.",
      zh: "我们驻河内的行程规划师与导游自2009年起为客人设计越南之旅，每一篇攻略都来自亲身实地经验。",
    },
    avatar: "/images/logo/vietlook-icon.png",
  },
};

export const allPosts = [...authoredPosts, ...migrated].sort((a, b) =>
  b.date.localeCompare(a.date),
);

export const getPost = (slug) => allPosts.find((p) => p.slug === slug);

export const postsByCategory = (cat) => allPosts.filter((p) => p.category === cat);

export const monthPosts = () =>
  allPosts.filter((p) => p.category === "vietnam-by-month").sort((a, b) => a.month - b.month);

export function relatedPosts(post, limit = 3) {
  return allPosts
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({
      p,
      score:
        (p.category === post.category ? 2 : 0) +
        (post.destination && p.destination === post.destination ? 3 : 0),
    }))
    .sort((a, b) => b.score - a.score || b.p.date.localeCompare(a.p.date))
    .slice(0, limit)
    .map((x) => x.p);
}

/** Ước tính thời gian đọc (phút). */
export const readingTime = (html = "") =>
  Math.max(2, Math.round(html.replace(/<[^>]+>/g, " ").split(/\s+/).length / 200));
