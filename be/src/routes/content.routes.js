import { Router } from "express";
import { createContentController } from "../controllers/content.controller.js";
import { requireStaff } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  articleService,
  authorService,
  carAreaService,
  carService,
  categoryService,
  destinationService,
  fastTrackService,
  themeService,
  tourService,
  visaTypeService,
} from "../services/modules.service.js";
import { idParam } from "../validators/common.validator.js";
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
 * Bộ route CRUD cho 1 loại nội dung (admin + editor):
 *   GET    /           danh sách (lọc, tìm, phân trang)
 *   POST   /           tạo
 *   PATCH  /order      đổi thứ tự hiển thị hàng loạt
 *   GET    /:id        chi tiết
 *   PUT    /:id        lưu (toàn bộ form)
 *   PATCH  /:id/visibility  ẩn / hiện
 *   DELETE /:id        xoá
 */
function crud(service, schema, type) {
  const c = createContentController(service, type);
  const r = Router();
  r.use(requireStaff);
  r.get("/", validate({ query: contentListQuery }), c.list);
  r.post("/", validate({ body: schema }), c.create);
  r.patch("/order", validate({ body: reorderSchema }), c.reorder);
  r.get("/:id", validate({ params: idParam }), c.get);
  r.put("/:id", validate({ params: idParam, body: schema }), c.update);
  r.patch("/:id/visibility", validate({ params: idParam, body: visibilitySchema }), c.visibility);
  r.delete("/:id", validate({ params: idParam }), c.remove);
  return r;
}

const router = Router();
router.use("/tours", crud(tourService, tourSchema, "tour"));
router.use("/destinations", crud(destinationService, destinationSchema, "destination"));
router.use("/themes", crud(themeService, themeSchema, "theme"));
router.use("/articles", crud(articleService, articleSchema, "article"));
router.use("/categories", crud(categoryService, categorySchema, "category"));
router.use("/authors", crud(authorService, authorSchema, "author"));
router.use("/cars", crud(carService, carSchema, "car"));
router.use("/car-areas", crud(carAreaService, carAreaSchema, "car_area"));
router.use("/visa-types", crud(visaTypeService, visaTypeSchema, "visa_type"));
router.use("/fast-track", crud(fastTrackService, fastTrackSchema, "fast_track"));

export default router;
