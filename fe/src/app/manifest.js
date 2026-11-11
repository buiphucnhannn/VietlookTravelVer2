import { siteConfig } from "@/constants/site";

/** /manifest.webmanifest — biểu tượng khi khách "Thêm vào màn hình chính" (Android / Chrome) */
export default function manifest() {
  return {
    name: siteConfig.name,
    short_name: "Vietlook",
    description:
      "Vietnam tours, private car rental, visa & fast-track — Vietlook Travel since 2009.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f6aa6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-256.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
