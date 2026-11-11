import Image from "next/image";
import Link from "next/link";
import { Be_Vietnam_Pro } from "next/font/google";
import "./site.css";

const siteFont = Be_Vietnam_Pro({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "600", "800"],
  variable: "--font-be-vietnam",
  // Font của trang 404 toàn cục bị Next gắn "tải trước" vào MỌI trang → tắt để không tải thừa 9 file font
  preload: false,
});

export const metadata = {
  title: "404 – Page not found | Vietlook Travel",
  robots: { index: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={siteFont.variable}>
      <body className="font-sans">
        <main className="relative grid min-h-screen place-items-center overflow-hidden bg-brand-950 px-6 text-center text-white">
          <Image
            src="/images/tours/v2/sapa-235925.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-30"
          />
          <div className="relative">
            <Image
              src="/images/logo/vietlook-icon.png"
              alt="Vietlook Travel"
              width={80}
              height={80}
              className="mx-auto rounded-full bg-white p-1"
            />
            <p className="mt-6 text-8xl font-extrabold tracking-tighter">404</p>
            <h1 className="mt-2 text-2xl font-semibold">
              <span className="whitespace-nowrap">Page not found</span> ·{" "}
              <span className="whitespace-nowrap">页面不存在</span> ·{" "}
              <span className="whitespace-nowrap">Không tìm thấy trang</span>
            </h1>
            <div className="mt-8 flex justify-center gap-3">
              <Link href="/" className="rounded-md bg-sun-500 px-6 py-3 font-semibold">
                English
              </Link>
              <Link
                href="/zh"
                className="rounded-md bg-white px-6 py-3 font-semibold text-brand-800"
              >
                中文
              </Link>
              <Link
                href="/vi"
                className="rounded-md bg-white px-6 py-3 font-semibold text-brand-800"
              >
                Tiếng Việt
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
