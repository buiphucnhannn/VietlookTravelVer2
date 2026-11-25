import Image from "next/image";
import { lang as rootLang } from "next/root-params";
import { getDictionary } from "@/i18n/dictionaries";
import { getPageText } from "@/lib/page-copy/server";
import { hasLocale, href, lp } from "@/i18n/config";
import { Button, Container } from "@/components/ui";

export default async function NotFound() {
  const raw = await rootLang();
  const lang = hasLocale(raw) ? raw : "en";
  const dict = await getDictionary(lang);
  // Chữ / ảnh sửa được: CMS → Giao diện trang → Trang không tìm thấy (404); chưa sửa = như cũ
  const p = await getPageText("not-found", lang, dict);
  return (
    <section className="relative isolate overflow-hidden bg-brand-950 text-white">
      <Image src={p.image} alt="" fill sizes="100vw" className="-z-10 object-cover opacity-35" />
      <Container className="flex min-h-[min(70vh,720px)] flex-col items-center justify-center pt-36 pb-24 text-center">
        <p className="text-8xl font-extrabold tracking-tighter">404</p>
        <h1 className="mt-3 text-3xl font-bold">{p.title}</h1>
        <p className="mt-3 max-w-md whitespace-pre-line text-white/80">{p.text}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href={href(lang)} variant="cta">
            {p.homeButton}
          </Button>
          <Button href={`${lp(lang)}/tours`} variant="outline-white">
            {p.toursButton}
          </Button>
        </div>
      </Container>
    </section>
  );
}
