import { Router } from "express";

import Notification from "../Controller/notifction.controller.js";

const router = Router();
router.post("/admin/notifications", Notification);
export default router;
