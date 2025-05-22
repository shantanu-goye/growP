import { PrismaClient } from "@prisma/client";
import cuid from "cuid";

const prisma = new PrismaClient();

// Create Deposit
export const createDeposit = async (req, res) => {
  try {
    const { amount, utr, transactionId } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const balance = await prisma.balance.findUnique({
      where: { userId_plan: { userId, plan: user.plan } },
    });

    if (!balance)
      return res
        .status(400)
        .json({ success: false, message: "Balance not found" });

    const deposit = await prisma.deposit.create({
      data: {
        userId,
        amount,
        balanceBefore: balance.balance,
        transactionId,
        DepositeId: `TXN-DP-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 6)}`,
        utr: utr || "",
        status: "pending",
      },
    });

    res
      .status(201)
      .json({ success: true, message: "Deposit created", deposit });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Deposit failed",
      error: error.message,
    });
  }
};

// Create Withdrawal
// Ensure cuid is imported if not already

export const createWithdrawal = async (req, res) => {
  try {
    const { amount, type } = req.body;
    const userId = req.user.id;

    if (!["full", "rewardOnly"].includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid withdrawal type" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const balance = await prisma.balance.findUnique({
      where: { userId_plan: { userId, plan: user.plan } },
    });

    if (!balance) {
      return res
        .status(400)
        .json({ success: false, message: "Balance not found" });
    }

    const { balance: totalBalance, rewardBalance } = balance;

    // Reject edge case: amount is greater than reward but less than full
    if (
      rewardBalance < amount &&
      amount <= totalBalance &&
      type === "rewardOnly"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Partial reward withdrawals are not allowed. Choose full withdrawal instead.",
      });
    }

    // Reject if insufficient balance based on type
    if (
      (type === "full" && totalBalance < amount) ||
      (type === "rewardOnly" && rewardBalance < amount)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });
    }

    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId,
        amount,
        balanceBefore: type === "full" ? totalBalance : rewardBalance,
        withdrawalId: cuid(),
        type,
        status: "pending",
      },
    });

    if (type === "full") {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });
    }

    return res
      .status(201)
      .json({ success: true, message: "Withdrawal created", withdrawal });
  } catch (error) {
    console.error("Withdrawal error:", error);
    return res.status(500).json({
      success: false,
      message: "Withdrawal failed",
      error: error.message,
    });
  }
};


// Update Deposit Status (Admin)
export const updateDepositStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!['pending', 'proceed', 'failed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const deposit = await prisma.deposit.findUnique({ where: { id } });
    if (!deposit) return res.status(404).json({ success: false, message: 'Deposit not found' });

    const updatedDeposit = await prisma.deposit.update({
      where: { id },
      data: { status, remarks }
    });

    if (status === 'proceed') {
      const user = await prisma.user.findUnique({
        where: { id: deposit.userId },
        select: { plan: true }
      });

      const balance = await prisma.balance.findUnique({
        where: { userId_plan: { userId: deposit.userId, plan: user.plan } }
      });

      await prisma.balance.update({
        where: { userId_plan: { userId: deposit.userId, plan: user.plan } },
        data: { balance: balance.balance + deposit.amount }
      });
    }

    res.status(200).json({ success: true, message: 'Deposit updated', deposit: updatedDeposit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Update failed', error: error.message });
  }
};

// Update Withdrawal Status (Admin)
export const updateWithdrawalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, transactionId, remarks } = req.body;

    if (!['pending', 'proceed', 'failed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) return res.status(404).json({ success: false, message: 'Withdrawal not found' });

    if (status === 'proceed' && !transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID required' });
    }

    const updatedWithdrawal = await prisma.withdrawal.update({
      where: { id },
      data: { status, transactionId, remarks }
    });

    if (status === 'proceed') {
      const user = await prisma.user.findUnique({
        where: { id: withdrawal.userId },
        select: { plan: true }
      });

      const balance = await prisma.balance.findUnique({
        where: { userId_plan: { userId: withdrawal.userId, plan: user.plan } }
      });

      const updateData = withdrawal.type === 'full'
        ? { balance: balance.balance - withdrawal.amount }
        : { rewardBalance: balance.rewardBalance - withdrawal.amount };

      await prisma.balance.update({
        where: { userId_plan: { userId: withdrawal.userId, plan: user.plan } },
        data: updateData
      });
    }

    res.status(200).json({ success: true, message: 'Withdrawal updated', withdrawal: updatedWithdrawal });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Update failed', error: error.message });
  }
};