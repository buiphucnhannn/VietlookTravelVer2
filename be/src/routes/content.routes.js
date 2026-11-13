import { Router } from "express";
import { createContentController } from "../controllers/content.controller.js";
import { OPTION_READERS, canAny } from "../constants/permissions.js";
import { requirePermission, requireStaff } from "../middlewares/auth.middleware.js";
import { ApiError } from "../utils/ApiError.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  articleService,
  authorService,
  carAreaService,
  carService,
  categoryService,
  destinationService,
  fastTrackService,
  reviewService,
  themeService,
  tourService,
  visaTypeService,
} from "../services/modules.service.js";
import { idParam } from "../validators/common.validator.js";
import { reviewImportService } from "../services/review-import.service.js";
import { limiter } from "../middlewares/rate-limit.middleware.js";
import { ok } from "../utils/response.js";
import { reviewImportQuery, reviewSchema } from "../validators/review.validator.js";
import {
  articleSchema,
  authorSchema,
  carAreaSchema,
  carSchema,
  categorySchema,
  contentListQuery,
  destinationSchema,
  fastTrackSchema,
  reorderSchema,
  themeSchema,
  tourSchema,
  visaTypeSchema,
  visibilitySchema,
} from "../validators/content.validator.js";

/**
 * Bộ route CRUD cho 1 loại nội dung — mỗi route kiểm tra quyền của tài khoản ở mục `module`:
 *   GET    /           danh sách (lọc, tìm, phân trang)      xem (hoặc xem mục dùng danh sách này để chọn)
 *   POST   /           tạo                                   sửa
 *   PATCH  /order      đổi thứ tự hiển thị hàng loạt          sửa
 *   GET    /:id        chi tiết                              xem
 *   PUT    /:id        lưu (toàn bộ form)                    sửa
 *   PATCH  /:id/visibility  ẩn / hiện                        sửa
 *   DELETE /:id        xoá                                   toàn quyền
 */
function crud(service, schema, type, module, options) {
  const c = createContentController(service, type, options);
  const view = requirePermission(module, "view");
  const edit = requirePermission(module, "edit");
  const full = requirePermission(module, "full");
  // Danh sách còn dùng làm ô chọn ở mục khác (vd. sửa Tour chọn Điểm đến) → cho mục đó đọc danh sách
  const readers = [module, ...(OPTION_READERS[module] ?? [])];
  const listView = (req, _res, next) =>
    canAny(req.user, readers, "view") ? next() : next(ApiError.forbidden());
  const r = Router();
  r.use(requireStaff);
  r.get("/", listView, validate({ query: contentListQuery }), c.list);
  r.post("/", edit, validate({ body: schema }), c.create);
  r.patch("/order", edit, validate({ body: reorderSchema }), c.reorder);
  r.get("/:id", view, validate({ params: idParam }), c.get);
  r.put("/:id", edit, validate({ params: idParam, body: schema }), c.update);
  r.patch(
    "/:id/visibility",
    edit,
    validate({ params: idParam, body: visibilitySchema }),
    c.visibility,
  );
  r.delete("/:id", full, validate({ params: idParam }), c.remove);
  return r;
}

const router = Router();
router.use("/tours", crud(tourService, tourSchema, "tour", "tours"));
router.use(
  "/destinations",
  crud(destinationService, destinationSchema, "destination", "destinations"),
);
router.use("/themes", crud(themeService, themeSchema, "theme", "themes"));
router.use("/articles", crud(articleService, articleSchema, "article", "articles"));
router.use("/categories", crud(categoryService, categorySchema, "category", "taxonomy"));
router.use("/authors", crud(authorService, authorSchema, "author", "taxonomy"));
router.use("/cars", crud(carService, carSchema, "car", "cars"));
router.use("/car-areas", crud(carAreaService, carAreaSchema, "car_area", "cars"));
router.use("/visa-types", crud(visaTypeService, visaTypeSchema, "visa_type", "visa"));
router.use("/fast-track", crud(fastTrackService, fastTrackSchema, "fast_track", "visa"));

// Lấy đánh giá mới nhất qua API chính thức (Tripadvisor / Google) để chọn thêm vào danh sách.
// Chỉ xem trước — thêm thật đi qua POST /reviews bình thường (kiểm tra dữ liệu + nhật ký). Quyền: sửa Đánh giá.
// Gắn TRƯỚC /reviews để "/import" không bị hiểu là mã đánh giá.
const reviewImport = Router();
reviewImport.use(requireStaff);
reviewImport.get("/sources", requirePermission("reviews", "view"), async (_req, res) =>
  ok(res, await reviewImportService.sources()),
);
reviewImport.get(
  "/preview",
  requirePermission("reviews", "edit"),
  limiter({
    windowMs: 10 * 60 * 1000,
    limit: 10,
    message: "Bạn vừa lấy đánh giá nhiều lần, vui lòng thử lại sau ít phút",
  }),
  validate({ query: reviewImportQuery }),
  async (req, res) =>
    ok(res, await reviewImportService.preview({ source: req.validated.query.source })),
);
router.use("/reviews/import", reviewImport);

// Đánh giá khách — nhật ký ghi tên người viết đánh giá
router.use(
  "/reviews",
  crud(reviewService, reviewSchema, "review", "reviews", { name: (d) => d?.name ?? "" }),
);

export default router;
