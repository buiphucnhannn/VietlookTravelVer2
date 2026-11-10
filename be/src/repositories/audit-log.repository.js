import { AuditLog } from "../models/audit-log.model.js";
import { BaseRepository } from "./base.repository.js";

class AuditLogRepository extends BaseRepository {
  constructor() {
    super(AuditLog);
  }
}

export const auditLogRepository = new AuditLogRepository();
