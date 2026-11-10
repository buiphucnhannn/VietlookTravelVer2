import { z } from "zod";

const lang = z.enum(["en", "zh", "vi"]);

/** Tối đa 400 đoạn, mỗi đoạn 60.000 ký tự, tổng 200.000 ký tự / lần dịch */
export const translateSchema = z
  .object({
    from: lang,
    to: z.array(lang).min(1).max(2),
    texts: z.array(z.string().max(60_000)).min(1).max(400),
  })
  .strict()
  .refine((v) => v.texts.reduce((n, t) => n + t.length, 0) <= 200_000, {
    message: "Nội dung quá dài để dịch một lần",
    path: ["texts"],
  });
