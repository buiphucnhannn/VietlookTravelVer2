import { z } from "zod";
import { objectId, pageQuery } from "./common.validator.js";

export const listAuditLogsQuery = pageQuery.extend({
  action: z
    .string()
    .trim()
    .regex(/^[a-z_.]{1,60}$/)
    .optional(),
  actor: objectId.optional(),
});
