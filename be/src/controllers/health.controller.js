import { isDatabaseReady } from "../config/database.js";
import { env } from "../config/env.js";

/** GET /api/v1/health — cho UptimeRobot / PM2 / load balancer. Không lộ phiên bản hay cấu hình nhạy cảm. */
export const healthController = {
  check(_req, res) {
    const db = isDatabaseReady();
    res.status(db ? 200 : 503).json({
      success: db,
      data: {
        status: db ? "ok" : "degraded",
        uptime: Math.round(process.uptime()),
        database: db ? "connected" : "disconnected",
        cloudinary: env.cloudinary.enabled ? "configured" : "not-configured",
      },
    });
  },
};
