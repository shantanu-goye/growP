import {
  createDeposit,
  createWithdrawal,
  updateDepositStatus,
  updateWithdrawalStatus,
  getUserDeposits,
  getUserWithdrawals,
  getAllDeposits,
  getAllWithdrawals,
} from "../Controller/transction.controller.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { verifyAdminToken } from "../middleware/adminauthMiddleware.js";
import express from "express";

const router = express.Router();
router.post("/deposit", authenticateToken, createDeposit);
router.post("/withdrawal", authenticateToken, createWithdrawal);
router.get("/deposits", authenticateToken, getUserDeposits);
router.get("/withdrawals", authenticateToken, getUserWithdrawals);

//prcotede routes for admin
router.put("/admin/deposits/:id", updateDepositStatus);
router.put("/admin/withdrawals/:id", updateWithdrawalStatus);
router.get("/admin/deposits", getAllDeposits);
router.get("/admin/withdrawals", getAllWithdrawals);

export default router;
