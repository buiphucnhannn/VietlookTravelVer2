import { ApiError } from "../utils/ApiError.js";

/**
 * Kiểm tra req.params / req.query / req.body bằng schema Zod.
 *   router.post("/", validate({ body: createUserSchema }), controller.create)
 * Dữ liệu sau khi parse (đã chuẩn hoá, BỎ trường lạ) lưu ở req.validated.{params,query,body}.
 * Controller CHỈ đọc req.validated — không đọc thẳng req.body (chống mass assignment, NoSQL injection).
 */
export const validate = (schemas) => (req, _res, next) => {
  req.validated = {};
  for (const key of ["params", "query", "body"]) {
    const schema = schemas[key];
    if (!schema) continue;
    const result = schema.safeParse(req[key] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: [key, ...i.path].join("."),
        message: i.message,
      }));
      return next(ApiError.unprocessable("Dữ liệu chưa hợp lệ — vui lòng kiểm tra lại", details));
    }
    req.validated[key] = result.data;
  }
  next();
};
