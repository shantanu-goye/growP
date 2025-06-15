import express from "express";
import {
  getRewardRates,
  updateRewardRate,
  getNonRewardDays,
  createNonRewardDay,
  deleteNonRewardDay,
} from "../Controller/rewardSettings.controller.js";
import { verifyAdminToken } from "../middleware/adminauthMiddleware.js";
const router = express.Router();

// Reward Rate Settings Routes
router.get("/reward-rates", getRewardRates);
router.put("/reward-rates/:plan", updateRewardRate);

// Non Reward Days Routes
router.get("/non-reward-days", getNonRewardDays);
router.post("/non-reward-days", createNonRewardDay);
router.delete("/non-reward-days/:id", deleteNonRewardDay);

export default router;
