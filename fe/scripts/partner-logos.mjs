/**
 * Chuẩn hoá logo đối tác (public/images/partners/*.svg|png|jpg) → WebP lossless nền trong suốt, cắt sát viền
 * (theo cách làm của dải đối tác dự án TranDuyMedia).
 * - SVG: render ở mật độ cao rồi cắt viền (giữ nét vector).
 * - PNG/JPG nền trắng: tách nền trắng thành trong suốt (color-to-alpha, giữ mép khử răng cưa).
 * - Ảnh đã trong suốt: chỉ cắt viền.
 * Không phóng to ảnh bitmap gốc (giữ độ nét thật). In ra bề rộng tương ứng chiều cao 160px cho PartnerStrip.
 * Chạy: node scripts/partner-logos.mjs   (ảnh gốc được xoá sau khi chuyển)
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const dir = path.resolve(import.meta.dirname, "..", "public", "images", "partners");
const MAX_H = 480; // đủ nét cho màn hình mật độ 3x (logo hiển thị cao tối đa ~64px)

for (const file of fs.readdirSync(dir).filter((f) => /\.(svg|png|jpe?g)$/i.test(f))) {
  const name = path.parse(file).name.toLowerCase();
  const src = path.join(dir, file);
  const isSvg = /\.svg$/i.test(file);
  const input = isSvg ? sharp(src, { density: 600 }) : sharp(src);
  const meta = await input.metadata();
  const { data, info } = await input.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = info.width * info.height;
  const out = Buffer.alloc(px * 4);
  const transparent = isSvg || (meta.hasAlpha && data[3] < 10);

  for (let i = 0; i < px; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a0 = data[i * 4 + 3] / 255;
    let [R, G, B, A] = [r, g, b, a0];
    if (!transparent) {
      // color-to-alpha với nền trắng: phần trắng → trong suốt, mép mịn giữ đúng màu
      const a = Math.max(255 - r, 255 - g, 255 - b) / 255;
      A = a * a0;
      if (a > 0) {
        R = Math.round(255 - (255 - r) / a);
        G = Math.round(255 - (255 - g) / a);
        B = Math.round(255 - (255 - b) / a);
      }
    }
    out[i * 4] = R;
    out[i * 4 + 1] = G;
    out[i * 4 + 2] = B;
    out[i * 4 + 3] = Math.round(A * 255);
  }

  const trimmed = await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1 })
    .toBuffer({ resolveWithObject: true });
  const h = Math.min(trimmed.info.height, MAX_H);
  const target = path.join(dir, `${name}.webp`);
  const res = await sharp(trimmed.data, {
    raw: { width: trimmed.info.width, height: trimmed.info.height, channels: 4 },
  })
    .resize({ height: h, withoutEnlargement: true })
    .webp({ lossless: true, effort: 6 })
    .toFile(target);
  fs.unlinkSync(src);
  console.log(
    `${name}.webp  ${res.width}x${res.height}  w@160=${Math.round((res.width / res.height) * 160)}`,
  );
}
