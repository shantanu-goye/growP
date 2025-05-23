import { PrismaClient } from "@prisma/client";
import cuid from "cuid";

const prisma = new PrismaClient();

// Create Deposit
import { sendMail } from "../utils/emailService.js"; // adjust as per your file structure

export const createDeposit = async (req, res) => {
  try {
    const { amount, utr, transactionId } = req.body;
    const userId = req.user.id;
    const newAmount = Number(amount);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const balance = await prisma.balance.findUnique({
      where: { userId_plan: { userId, plan: user.plan } },
    });

    if (!balance) {
      return res.status(400).json({
        success: false,
        message: "Balance not found",
      });
    }

    const requiredAmount = {
      seed: 10000,
      plant: 50000,
      tree: 100000,
    }[user.plan];

    const activatedNow = !user.isActive && newAmount >= requiredAmount;

    if (!user.isActive && !activatedNow) {
      return res.status(400).json({
        success: false,
        message: `Minimum deposit required for '${user.plan}' plan is ₹${requiredAmount}`,
      });
    }

    const depositId = `TXN-DP-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 6)}`;

    const transactionQueries = [];

    if (activatedNow) {
      transactionQueries.push(
        prisma.user.update({
          where: { id: userId },
          data: { isActive: true },
        })
      );
    }

    transactionQueries.push(
      prisma.deposit.create({
        data: {
          userId,
          amount: newAmount,
          balanceBefore: balance.balance,
          transactionId,
          depositId,
          utr: utr || "",
          status: "pending",
        },
      }),
      prisma.balance.update({
        where: { userId_plan: { userId, plan: user.plan } },
        data: {
          pendingDepositBalance: {
            increment: newAmount,
          },
        },
      })
    );

    const [, deposit] = await prisma.$transaction(transactionQueries);

    if (user.isActive || activatedNow) {
      await sendMail({
        to: user.email,
        subject: "Deposit Received",
        html: `<p>Hello ${user.name},</p><p>We have received your deposit of ₹${newAmount}. It is currently pending approval.</p>`,
      });
    }

    return res.status(201).json({
      success: true,
      message: activatedNow
        ? "Account activated and deposit is pending approval."
        : "Deposit submitted and pending approval.",
      deposit,
    });
  } catch (error) {
    console.error("Deposit error:", error);

    let message = "Deposit failed";

    if (
      error.code === "ECONNREFUSED" ||
      error.message.includes("Can't reach database")
    ) {
      message = "Database connection failed. Please try again later.";
    }

    return res.status(500).json({
      success: false,
      message,
      error: error.message,
    });
  }
};

// Create Withdrawal
// Ensure cuid is imported if not already


export const createWithdrawal = async (req, res) => {
  try {
    const { type } = req.body;
    const userId = req.user.id;

    if (!["full", "rewardOnly"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid withdrawal type",
      });
    }

    // Fetch user with plan info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, name: true, email: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Fetch the first Balance record of the user
    const balances = await prisma.balance.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 1,
    });

    if (balances.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No balance record found",
      });
    }

    const balance = balances[0];
    const { balance: totalBalance, rewardBalance, plan } = balance;

    const minRequiredBalance = {
      seed: 5000,
      plant: 10000,
      tree: 15000,
    };

    const minBalance = minRequiredBalance[plan];
    const applicableBalance = type === "rewardOnly" ? rewardBalance : totalBalance;

    if (applicableBalance < minBalance) {
      return res.status(400).json({
        success: false,
        message: `Minimum ₹${minBalance} required in your ${type === "rewardOnly" ? "reward " : ""}balance for the ${plan} plan.`,
      });
    }

    if (applicableBalance <= 0) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance to withdraw",
      });
    }

    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId,
        amount: applicableBalance,
        balanceBefore: applicableBalance,
        withdrawalId: cuid(),
        transactionId: cuid(),
        type,
        status: "pending",
      },
    });

    if (type === "full") {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      await sendMail({
        to: user.email,
        subject: "Withdrawal & Account Termination Notice",
        html: `
          <p>Hello ${user.name},</p>
          <p>We’ve received your full withdrawal request of ₹${applicableBalance}. Your account is now <strong>terminated</strong>.</p>
          <p>Please visit your bank branch for more information or to reactivate your account.</p>
        `,
      });
    } else {
      await sendMail({
        to: user.email,
        subject: "Withdrawal Request Received",
        html: `
          <p>Hello ${user.name},</p>
          <p>Your reward withdrawal request of ₹${applicableBalance} has been received and is currently pending review.</p>
          <p>We will inform you once it is processed.</p>
        `,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Withdrawal created successfully",
      withdrawal,
    });
  } catch (error) {
    console.error("Withdrawal error:", error);
    return res.status(500).json({
      success: false,
      message: "Withdrawal failed",
      error: error.message,
    });
  }
};


// utils/sendMail.js (assuming you already have this)
// export async function sendMail({ to, subject, html }) { ... }

// --- Admin: Update Deposit Status ---
export const updateDepositStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!["pending", "proceed", "failed"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const deposit = await prisma.deposit.findUnique({ where: { id } });
    if (!deposit) {
      return res
        .status(404)
        .json({ success: false, message: "Deposit not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: deposit.userId },
      select: { name: true, email: true, plan: true },
    });

    const balanceUpdateOps = [];

    // Only adjust balance if status is not still pending
    if (status === "proceed" || status === "failed") {
      const balance = await prisma.balance.findUnique({
        where: { userId_plan: { userId: deposit.userId, plan: user.plan } },
      });

      const balanceUpdate = {
        pendingDepositBalance: {
          decrement: deposit.amount,
        },
      };

      if (status === "proceed") {
        balanceUpdate.balance = {
          increment: deposit.amount,
        };
      }

      balanceUpdateOps.push(
        prisma.balance.update({
          where: { userId_plan: { userId: deposit.userId, plan: user.plan } },
          data: balanceUpdate,
        })
      );
    }

    // Run all updates in a transaction
    const [updatedDeposit] = await prisma.$transaction([
      prisma.deposit.update({
        where: { id },
        data: { status, remarks },
      }),
      ...balanceUpdateOps,
    ]);

    // Send Email Notification
    await sendMail({
      to: user.email,
      subject: `Deposit ${status === "proceed" ? "Confirmed" : "Failed"}`,
      html: `
        <p>Hello ${user.name},</p>
        <p>Your deposit of ₹${
          deposit.amount
        } has been <strong>${status}</strong>.</p>
        ${
          status === "proceed"
            ? "<p>Funds have been added to your account balance.</p>"
            : "<p>Please check your transaction and try again if needed.</p>"
        }
      `,
    });

    res.status(200).json({
      success: true,
      message: "Deposit updated",
      deposit: updatedDeposit,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Update failed", error: error.message });
  }
};

// --- Admin: Update Withdrawal Status ---
export const updateWithdrawalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, transactionId, remarks } = req.body;

    if (!["pending", "proceed", "failed"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal)
      return res
        .status(404)
        .json({ success: false, message: "Withdrawal not found" });

    if (status === "proceed" && !transactionId) {
      return res
        .status(400)
        .json({ success: false, message: "Transaction ID required" });
    }

    const updatedWithdrawal = await prisma.withdrawal.update({
      where: { id },
      data: { status, transactionId, remarks },
    });

    const user = await prisma.user.findUnique({
      where: { id: withdrawal.userId },
      select: { name: true, email: true, plan: true },
    });

    if (status === "proceed") {
      const balance = await prisma.balance.findUnique({
        where: { userId_plan: { userId: withdrawal.userId, plan: user.plan } },
      });

      const updateData =
        withdrawal.type === "full"
          ? { balance: balance.balance - withdrawal.amount }
          : { rewardBalance: balance.rewardBalance - withdrawal.amount };

      await prisma.balance.update({
        where: { userId_plan: { userId: withdrawal.userId, plan: user.plan } },
        data: updateData,
      });

      if (withdrawal.type === "full") {
        await prisma.user.update({
          where: { id: withdrawal.userId },
          data: { isActive: false },
        });
      }
    }

    // Send Email Notification
    await sendMail({
      to: user.email,
      subject: `Withdrawal ${status === "proceed" ? "Processed" : "Failed"}`,
      html: `
        <p>Hello ${user.name},</p>
        <p>Your withdrawal of ₹${
          withdrawal.amount
        } has been <strong>${status}</strong>.</p>
        ${
          status === "proceed"
            ? withdrawal.type === "full"
              ? "<p>Your account has been deactivated due to full withdrawal. Visit your bank for more info or reactivation.</p>"
              : "<p>The funds will be credited to your linked account shortly.</p>"
            : "<p>Please check the details and try again.</p>"
        }
      `,
    });

    res.status(200).json({
      success: true,
      message: "Withdrawal updated",
      withdrawal: updatedWithdrawal,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Update failed", error: error.message });
  }
};

// Get user's deposits
export const getUserDeposits = async (req, res) => {
  try {
    const userId = req.user.id;

    const deposits = await prisma.deposit.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        status: true,
        depositId: true,
        createdAt: true,
        updatedAt: true,
        remarks: true,
      },
    });

    res.status(200).json({
      success: true,
      count: deposits.length,
      deposits,
    });
  } catch (error) {
    console.error("Get deposits error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch deposits",
      error: error.message,
    });
  }
};

// Get user's withdrawals
export const getUserWithdrawals = async (req, res) => {
  try {
    const userId = req.user.id;

    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        type: true,
        status: true,
        withdrawalId: true,
        createdAt: true,
        updatedAt: true,
        remarks: true,
        transactionId: true,
      },
    });

    res.status(200).json({
      success: true,
      count: withdrawals.length,
      withdrawals,
    });
  } catch (error) {
    console.error("Get withdrawals error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch withdrawals",
      error: error.message,
    });
  }
};

// Admin: Get all deposits
export const getAllDeposits = async (req, res) => {
  try {
    const deposits = await prisma.deposit.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            plan: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      count: deposits.length,
      deposits,
    });
  } catch (error) {
    console.error("Get all deposits error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch deposits",
      error: error.message,
    });
  }
};

// Admin: Get all withdrawals
export const getAllWithdrawals = async (req, res) => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            plan: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      count: withdrawals.length,
      withdrawals,
    });
  } catch (error) {
    console.error("Get all withdrawals error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch withdrawals",
      error: error.message,
    });
  }
};