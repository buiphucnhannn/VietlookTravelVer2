import { Session } from "../models/session.model.js";
import { BaseRepository, trusted } from "./base.repository.js";

class SessionRepository extends BaseRepository {
  constructor() {
    super(Session);
  }

  findByTokenHash(tokenHash) {
    return this.model.findOne({ tokenHash }).lean();
  }

  /** Thu hồi nếu còn hoạt động (nguyên tử) — trả true nếu chính lệnh này đã thu hồi */
  async revokeIfActive(id, replacedBy = null) {
    const r = await this.model.updateOne(
      { _id: id, revokedAt: null },
      { $set: { revokedAt: new Date(), replacedBy } },
    );
    return r.modifiedCount === 1;
  }

  revokeAllForUser(user, { exceptId } = {}) {
    return this.model.updateMany(
      { user, revokedAt: null, ...(exceptId && { _id: trusted({ $ne: exceptId }) }) },
      { $set: { revokedAt: new Date() } },
    );
  }

  /** Giữ tối đa `keep` phiên đang hoạt động — thu hồi các phiên cũ nhất */
  async revokeOldest(user, keep) {
    const active = await this.model
      .find({ user, revokedAt: null, expiresAt: trusted({ $gt: new Date() }) })
      .sort({ createdAt: -1 })
      .select("_id")
      .lean();
    const extra = active.slice(keep).map((s) => s._id);
    if (extra.length)
      await this.model.updateMany(
        { _id: trusted({ $in: extra }) },
        {
          $set: { revokedAt: new Date() },
        },
      );
  }
}

export const sessionRepository = new SessionRepository();
