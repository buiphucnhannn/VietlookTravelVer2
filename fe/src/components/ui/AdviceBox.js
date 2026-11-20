import Button from "./Button";

/** Hộp "Not sure which tour to choose?" kiểu localvietnam. */
export default function AdviceBox({ title, text, cta, href }) {
  return (
    // Dải ngang gọn: chữ bên trái, nút bên phải
    <div className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-border sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{title}</h2>
        <p className="mt-2 max-w-4xl leading-relaxed text-ink/75">{text}</p>
      </div>
      <Button href={href} variant="primary" className="shrink-0 self-start lg:self-center">
        {cta}
      </Button>
    </div>
  );
}
