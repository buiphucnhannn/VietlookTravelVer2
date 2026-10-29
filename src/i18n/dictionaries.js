import "server-only";
import { notFound } from "next/navigation";
import { hasLocale } from "./config";

const dictionaries = {
  en: () => import("./dictionaries/en").then((m) => m.default),
  zh: () => import("./dictionaries/zh").then((m) => m.default),
};

export async function getDictionary(lang) {
  if (!hasLocale(lang)) notFound();
  return dictionaries[lang]();
}
