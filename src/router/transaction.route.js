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
import express from "express";

const router = express.Router();
router.post('/deposit', authenticateToken, createDeposit);
router.post('/withdrawal', authenticateToken, createWithdrawal);
router.get('/deposits', authenticateToken, getUserDeposits);
router.get('/withdrawals', authenticateToken, getUserWithdrawals);

export default router