"use client";

import { BrushHero } from "@/components/ui/PageHero";
import { HeroImagePills, ImagePill, PreviewImage, Shown, Txt, usePlain } from "../blocks";
import { Zone } from "./site-frame";

/**
 * Đầu trang kiểu BrushHero — dựng bằng đúng component website (components/ui/PageHero.js): dải 1–3 ảnh ghép, phủ
 * tối, tiêu đề nét cọ, header trong suốt phủ lên. Chữ bấm vào là sửa, mỗi ảnh có nút đổi ảnh.
 *   images   : đường dẫn danh sách ảnh sửa được ("heroImages") · count: số ảnh (website hiện tối đa 3)
 *   image    : hoặc 1 ô ảnh đơn ("heroImage")
 *   fixedImages: ảnh cố định (không sửa ở đây) thay cho `images`
 *   title / subtitle: đường dẫn ô chữ · crumb: chữ ở đường dẫn "Vietlook › …" (mặc định = tiêu đề)
 *   collage  : đường dẫn danh sách ảnh khung "giọt nước" (trang danh sách tour) · compact: tiêu đề nhỏ, không nét cọ
 *   children : nút / dòng thêm dưới tiêu đề (y như trang thật)
 */
export default function BrushHeroPreview({
  images,
  image,
  count = 3,
  fixedImages,
  title,
  subtitle,
  crumb,
  collage,
  compact,
  cta,
  pills = true,
  children,
}) {
  const plain = usePlain();
  const list =
    fixedImages ??
    (image ? [plain(image)] : Array.from({ length: count }, (_, i) => plain(`${images}.${i}`)));
  return (
    <Zone
      name="Đầu trang"
      dark
      at={collage ? "left-3 bottom-12" : "left-3 top-20 lg:top-[7.25rem]"}
    >
      <BrushHero
        ImageComponent={PreviewImage}
        title={<Txt f={title} dark />}
        subtitle={subtitle && <Txt f={subtitle} dark />}
        images={list}
        collage={collage && Array.from({ length: 3 }, (_, i) => plain(`${collage}.${i}`))}
        compact={compact}
        cta={cta}
        breadcrumbs={[{ label: "Vietlook", href: "#" }, { label: crumb ?? <Shown f={title} /> }]}
      >
        {children}
        {pills && images && !fixedImages && (
          <HeroImagePills f={images} count={collage ? 1 : count} />
        )}
        {pills && image && <ImagePill f={image} className="right-3 bottom-3" />}
      </BrushHero>
    </Zone>
  );
}
