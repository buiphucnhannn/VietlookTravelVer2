import { Router } from "express";
import { overviewController } from "../controllers/overview.controller.js";
import { requireEnquiryList } from "../middlewares/enquiry-access.middleware.js";
import { requireStaff } from "../middlewares/auth.middleware.js";

/** Trang Tổng quan — số liệu đơn / yêu cầu: cần xem được Đơn đặt tour hoặc Yêu cầu từ form */
const router = Router();

router.get("/enquiries", requireStaff, requireEnquiryList, overviewController.enquiries);

export default router;
