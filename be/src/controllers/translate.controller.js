import { translateService } from "../services/translate.service.js";
import { ok } from "../utils/response.js";

export const translateController = {
  async translate(req, res) {
    ok(res, await translateService.translate(req.validated.body));
  },
};
