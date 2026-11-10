import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aboutVideo, bannerVideo, media, videoLink } from "../src/validators/content.validator.js";
import { driveVideoSchema } from "../src/validators/upload.validator.js";
import {
  bannerVideoPublicId,
  checkImageUrl,
  sniffImage,
  uploadService,
} from "../src/services/upload.service.js";
import {
  cloudinaryVideo,
  cloudinaryVideoUrl,
  driveDownloadUrl,
  driveThumb,
  parseVideo,
} from "../src/utils/video.js";

const ok = (schema, v) => schema.safeParse(v);
const DRIVE = "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view?usp=sharing";

describe("link video (YouTube / Google Drive)", () => {
  it("nhận các dạng link YouTube và chuẩn hoá", () => {
    for (const v of [
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      "dQw4w9WgXcQ",
    ]) {
      const r = ok(videoLink, v);
      assert.equal(r.success, true, v);
      assert.equal(r.data, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    }
  });

  it("nhận link Google Drive đã chia sẻ", () => {
    const r = ok(videoLink, DRIVE);
    assert.equal(r.success, true);
    assert.equal(r.data, "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view");
  });

  it("chặn link lạ / giả mạo / không an toàn", () => {
    for (const v of [
      "http://youtu.be/dQw4w9WgXcQ",
      "https://evil.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
      "https://user:pw@youtube.com/watch?v=dQw4w9WgXcQ",
      "javascript:alert(1)",
      "https://www.youtube.com/watch?v=<script>",
      "https://drive.google.com/drive/folders/abc",
    ])
      assert.equal(ok(videoLink, v).success, false, v);
  });

  it("video nền trang chủ: YouTube, video có sẵn; link Drive phải chép về trước", () => {
    assert.equal(ok(bannerVideo, "/videos/vl2-halong.mp4").success, true);
    assert.equal(ok(bannerVideo, "https://youtu.be/dQw4w9WgXcQ").success, true);
    const d = ok(bannerVideo, DRIVE);
    assert.equal(d.success, false);
    assert.match(d.error.issues[0].message, /chép về website/);
    assert.equal(ok(bannerVideo, "/videos/../secret.mp4").success, false);
  });

  it("video nền: nhận video Cloudinary của website (thư mục banner) và chuẩn hoá", () => {
    const want =
      "https://res.cloudinary.com/vltest/video/upload/c_limit,q_auto,w_1920/v1712345678/vietlook/banner/drive-abc_DEF-123.mp4";
    for (const v of [
      want,
      "https://res.cloudinary.com/vltest/video/upload/v1712345678/vietlook/banner/drive-abc_DEF-123.mp4",
      "https://res.cloudinary.com/vltest/video/upload/f_auto,q_auto/v1712345678/vietlook/banner/drive-abc_DEF-123.webm",
    ]) {
      const r = ok(bannerVideo, v);
      assert.equal(r.success, true, v);
      assert.equal(r.data, want);
    }
  });

  it("video nền: chặn video Cloudinary tài khoản khác / thư mục khác / host lạ", () => {
    for (const v of [
      "https://res.cloudinary.com/other/video/upload/v1/vietlook/banner/x.mp4", // tài khoản khác
      "https://res.cloudinary.com/vltest/video/upload/v1/vietlook/tours/x.mp4", // ngoài thư mục banner
      "https://res.cloudinary.com/vltest/video/upload/v1/other/banner/x.mp4",
      "https://res.cloudinary.com/vltest/image/upload/v1/vietlook/banner/x.mp4", // không phải video
      "https://res.cloudinary.com.evil.com/vltest/video/upload/v1/vietlook/banner/x.mp4",
      "https://evil.com/vltest/video/upload/v1/vietlook/banner/x.mp4",
      "http://res.cloudinary.com/vltest/video/upload/v1/vietlook/banner/x.mp4",
      "https://res.cloudinary.com/vltest/video/upload/v1/vietlook/banner/../x.mp4",
      "https://example.com/video.mp4",
    ])
      assert.equal(ok(bannerVideo, v).success, false, v);
  });

  it("video trang giới thiệu: nhận YouTube và Drive, trống = mặc định", () => {
    assert.equal(ok(aboutVideo, "").data, "");
    assert.equal(ok(aboutVideo, "  ").data, "");
    assert.equal(
      ok(aboutVideo, "https://youtu.be/dQw4w9WgXcQ").data,
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    assert.equal(
      ok(aboutVideo, DRIVE).data,
      "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view",
    );
    assert.equal(ok(aboutVideo, "https://vimeo.com/123").success, false);
  });
});

describe("dựng link video từ mã (không dùng nguyên văn link người dùng)", () => {
  it("parseVideo: các dạng link Drive", () => {
    const id = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345";
    for (const v of [
      `https://drive.google.com/file/d/${id}/view?usp=sharing`,
      `https://drive.google.com/file/d/${id}/preview`,
      `https://drive.google.com/open?id=${id}`,
      `https://drive.google.com/uc?export=download&id=${id}`,
      "https://drive.google.com/file/d/0B32098YdDwTAcmJxVl9Kc1piT2s/view", // mã kiểu cũ
    ])
      assert.equal(parseVideo(v)?.provider, "drive", v);
    assert.equal(parseVideo(`https://drive.google.com.evil.com/file/d/${id}/view`), null);
    assert.equal(parseVideo(`https://docs.google.com/file/d/${id}/view`), null);
    assert.equal(parseVideo("https://drive.google.com/file/d/short/view"), null);
  });

  it("driveDownloadUrl / driveThumb chỉ dựng từ mã hợp lệ", () => {
    const id = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345";
    assert.equal(
      driveDownloadUrl(id),
      `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`,
    );
    assert.equal(driveThumb(id, 640), `https://drive.google.com/thumbnail?id=${id}&sz=w640`);
    for (const bad of ["", "abc", "x&id=evil", `${id}/../../`, "http://evil.com", null])
      assert.equal(driveDownloadUrl(bad), null, String(bad));
  });

  it("cloudinaryVideo / cloudinaryVideoUrl", () => {
    const c = cloudinaryVideo(
      "https://res.cloudinary.com/vltest/video/upload/v17/vietlook/banner/drive-x.mp4",
    );
    assert.deepEqual(c, { cloud: "vltest", version: "17", publicId: "vietlook/banner/drive-x" });
    assert.equal(
      cloudinaryVideoUrl(c, { width: 720 }),
      "https://res.cloudinary.com/vltest/video/upload/c_limit,q_auto,w_720/v17/vietlook/banner/drive-x.mp4",
    );
    assert.equal(
      cloudinaryVideoUrl(c, { poster: true, width: 640 }),
      "https://res.cloudinary.com/vltest/video/upload/c_limit,q_auto,so_0,w_640/v17/vietlook/banner/drive-x.jpg",
    );
    assert.equal(cloudinaryVideo("https://res.cloudinary.com/vltest/video/upload/x.mp4"), null);
  });

  it("chỉ xoá video nền trong thư mục banner của website", () => {
    assert.equal(
      bannerVideoPublicId(
        "https://res.cloudinary.com/vltest/video/upload/c_limit,q_auto,w_1920/v1/vietlook/banner/drive-x.mp4",
      ),
      "vietlook/banner/drive-x",
    );
    for (const v of [
      "https://res.cloudinary.com/other/video/upload/v1/vietlook/banner/drive-x.mp4",
      "https://res.cloudinary.com/vltest/video/upload/v1/vietlook/site/hero.mp4",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "/videos/vl2-halong.mp4",
      "",
    ])
      assert.equal(bannerVideoPublicId(v), null, v);
  });

  it("schema chép video Drive chỉ nhận link Drive", () => {
    assert.equal(ok(driveVideoSchema, { url: DRIVE }).success, true);
    for (const url of [
      "https://youtu.be/dQw4w9WgXcQ",
      "https://evil.com/a.mp4",
      "http://169.254.169.254/",
    ])
      assert.equal(ok(driveVideoSchema, { url }).success, false, url);
  });

  it("chép video Drive: xong nhanh → trả luôn; lâu → mã việc, chỉ người tạo xem được", async () => {
    const real = uploadService.importDriveVideo;
    try {
      uploadService.importDriveVideo = async () => ({ url: "u", publicId: "p" });
      let audited = 0;
      const fast = await uploadService.startDriveImport(DRIVE, "u1", () => audited++);
      assert.deepEqual(fast, { video: { url: "u", publicId: "p" } });
      assert.equal(audited, 1);

      let finish;
      uploadService.importDriveVideo = () => new Promise((r) => (finish = r));
      const slow = await uploadService.startDriveImport(DRIVE, "u1", null, { waitMs: 5 });
      assert.match(slow.jobId, /^[\da-f-]{36}$/);
      assert.deepEqual(uploadService.driveImportJob(slow.jobId, "u1"), { status: "pending" });
      assert.throws(() => uploadService.driveImportJob(slow.jobId, "u2"), /Không tìm thấy/);
      finish({ url: "v" });
      await new Promise((r) => setImmediate(r));
      assert.deepEqual(uploadService.driveImportJob(slow.jobId, "u1"), {
        status: "done",
        video: { url: "v" },
      });
      assert.throws(() => uploadService.driveImportJob(slow.jobId, "u1"), /Không tìm thấy/); // đã lấy rồi

      uploadService.importDriveVideo = async () => {
        throw new Error("drive private");
      };
      await assert.rejects(uploadService.startDriveImport(DRIVE, "u1"), /drive private/);
    } finally {
      uploadService.importDriveVideo = real;
    }
  });
});

describe("ảnh", () => {
  it("chỉ nhận ảnh Cloudinary của website / ảnh có sẵn", () => {
    for (const v of [
      "https://res.cloudinary.com/dzpmroj28/image/upload/v1/vietlook/tours/a.jpg",
      "/images/tours/v2/x.jpg",
      "/images/tours/hcm-tour-2 (2).jpg",
      "/videos/vl2-halong.webp",
    ])
      assert.equal(ok(media, v).success, true, v);
    for (const v of [
      "https://res.cloudinary.com/x/video/upload/a.mp4",
      "https://evil.com/x.jpg",
      "/images/../../etc/passwd.jpg",
      "javascript:alert(1)",
      "data:image/png;base64,AAAA",
    ])
      assert.equal(ok(media, v).success, false, v);
  });

  it("kiểm tra chữ ký file ảnh (magic bytes)", () => {
    assert.equal(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])), "jpeg");
    assert.equal(sniffImage(Buffer.from("89504e470d0a1a0a0000000000000000", "hex")), "png");
    assert.equal(sniffImage(Buffer.from("RIFF\0\0\0\0WEBPVP8 ")), "webp");
    assert.equal(sniffImage(Buffer.from("<svg onload=alert(1)>")), null);
    assert.equal(sniffImage(Buffer.from("<?php echo 1; ?>xxxxxx")), null);
  });

  it("link ảnh ngoài: chỉ http(s) công khai", () => {
    assert.equal(checkImageUrl("https://images.unsplash.com/photo-1.jpg"), true);
    for (const v of [
      "ftp://x.com/a.jpg",
      "javascript:alert(1)",
      "http://localhost/a.jpg",
      "http://127.0.0.1/a.jpg",
      "http://169.254.169.254/latest/meta-data",
      "http://10.0.0.5/a.jpg",
      "http://192.168.1.1/a.jpg",
      "https://user:pass@x.com/a.jpg",
      "http://[::1]/a.jpg",
    ])
      assert.equal(checkImageUrl(v), false, v);
  });
});

describe("lọc HTML nội dung", async () => {
  const { cleanHtml } = await import("../src/utils/sanitize.js");
  it("giữ ảnh Cloudinary / ảnh có sẵn, bỏ ảnh ngoài và data:", () => {
    const out = cleanHtml(
      '<p>a</p><img src="https://res.cloudinary.com/dzpmroj28/image/upload/v1/x.jpg"><img src="/images/tours/a.jpg"><img src="https://evil.com/track.gif"><img src="data:image/svg+xml;base64,PHN2Zz4=">',
    );
    assert.match(out, /res\.cloudinary\.com/);
    assert.match(out, /\/images\/tours\/a\.jpg/);
    assert.doesNotMatch(out, /evil\.com|data:/);
  });
  it("iframe chỉ YouTube / Vimeo / Drive", () => {
    const out = cleanHtml(
      '<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe><iframe src="https://evil.com/x"></iframe>',
    );
    assert.match(out, /youtube-nocookie/);
    assert.doesNotMatch(out, /evil\.com/);
  });
});

describe("giá theo mẫu thông tin tour", async () => {
  const { estimatePrice, hotelClasses } = await import("../src/utils/pricing.js");
  const tour = {
    price: 435,
    pricing: {
      groupTiers: [
        { minPax: 2, maxPax: 3, price: 460, price4: 520, price5: null },
        { minPax: 4, maxPax: 5, price: 420, price4: 480, price5: 560 },
      ],
      childRates: [
        { minAge: 0, maxAge: 4, percent: 0 },
        { minAge: 5, maxAge: 11, percent: 75 },
      ],
      singleSupplement: 120,
      holidayPercent: 15,
      holidayDates: ["02-10"],
    },
  };
  it("hạng khách sạn có giá", () => assert.deepEqual(hotelClasses(tour), [3, 4, 5]));
  it("2 khách 4★", () =>
    assert.equal(estimatePrice(tour, { adults: 2, hotelClass: 4 }).total, 1040));
  it("5★ chưa có giá ở bậc 2 khách → giá 5★ của bậc gần nhất (không rơi về giá 'từ')", () =>
    assert.equal(estimatePrice(tour, { adults: 2, hotelClass: 5 }).total, 1120));
  it("4 khách 5★ + bé 8 tuổi 75%", () =>
    assert.equal(
      estimatePrice(tour, { adults: 4, childAges: [8], hotelClass: 5 }).total,
      560 * 4 + 420,
    ));
  it("Tết +15%", () =>
    assert.equal(
      estimatePrice(tour, { adults: 2, date: "2027-02-10", hotelClass: 3 }).total,
      920 + 138,
    ));
  it("1 khách (chưa có bậc 1 khách): giá bậc gần nhất + phòng đơn", () =>
    assert.equal(estimatePrice(tour, { adults: 1 }).total, 580));
  it("đông hơn bậc cuối → giá bậc cuối", () =>
    assert.equal(estimatePrice(tour, { adults: 8, hotelClass: 4 }).total, 480 * 8));
  it("tour không có bảng giá → giá bán", () =>
    assert.equal(estimatePrice({ price: 300 }, { adults: 2 }).total, 600));
});
