import { siteConfig } from "@/constants/site";

export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/login"] },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
