import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import { logger } from "../config/logger.js";

const path = (req) => (req.originalUrl ?? req.url).split("?")[0]; // bỏ query (có thể chứa email / SĐT)

const SKIP = new Set(["/", "/favicon.ico", "/api/v1/health"]);
const SAFE_ID = /^[\w-]{8,64}$/; // mã request từ proxy phía trước — chỉ nhận chuỗi an toàn, ngắn

/**
 * Log mỗi request 1 dòng khi phản hồi xong: "GET /api/v1/users 200 - 12ms".
 * Mỗi request có reqId (trả về header X-Request-Id) → đối chiếu lỗi khách báo với log server.
 * Không ghi header, cookie, body, query.
 */
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers["x-request-id"];
    const id = typeof incoming === "string" && SAFE_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  customProps: (req) => ({ reqId: req.id }),
  autoLogging: { ignore: (req) => SKIP.has(path(req)) },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400 && ![401, 404].includes(res.statusCode)) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res, ms) =>
    `${req.method} ${path(req)} ${res.statusCode} - ${Math.round(ms)}ms`,
  customErrorObject: (_req, _res, _err, { err: _e, ...rest }) => rest,
  customErrorMessage: (req, res) => `${req.method} ${path(req)} ${res.statusCode} - error`,
  serializers: {
    req: (req) => ({ method: req.method, url: path(req), ip: req.raw?.ip }),
    res: (res) => ({ status: res.statusCode }),
  },
});
