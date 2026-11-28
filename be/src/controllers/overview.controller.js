import { viewableKinds } from "../middlewares/enquiry-access.middleware.js";
import { overviewService } from "../services/overview.service.js";
import { ok } from "../utils/response.js";

export const overviewController = {
  /** Biểu đồ + xu hướng đơn / yêu cầu 14 ngày — chỉ nhóm tài khoản được xem */
  enquiries: async (req, res) => ok(res, await overviewService.enquiries(viewableKinds(req.user))),
};
