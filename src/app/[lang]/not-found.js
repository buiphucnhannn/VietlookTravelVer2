import Image from "next/image";
import { lang as rootLang } from "next/root-params";
import { getDictionary } from "@/i18n/dictionaries";
import { hasLocale, href, lp } from "@/i18n/config";
import { Button, Container } from "@/components/ui";

export default async function NotFound() {
  const raw = await rootLang();
  const lang = hasLocale(raw) ? raw : "en";
  const dict = await getDictionary(lang);
  return (
    <section className="relative isolate overflow-hidden bg-brand-950 text-white">
      <Image
        src="/images/tours/v2/sapa-235925.jpg"
        alt=""
        fill
        sizes="100vw"
        className="-z-10 object-cover opacity-35"
      />
      <Container className="flex min-h-[min(60vh,640px)] flex-col items-center justify-center py-24 text-center">
        <p className="text-8xl font-extrabold tracking-tighter">404</p>
        <h1 className="mt-3 text-3xl font-bold">{dict.notFound.title}</h1>
        <p className="mt-3 max-w-md text-white/80">{dict.notFound.text}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href={href(lang)} variant="cta">
            {dict.common.backHome}
          </Button>
          <Button href={`${lp(lang)}/tours`} variant="outline-white">
            {dict.nav.allTours}
          </Button>
        </div>
      </Container>
    </section>
  );
}
