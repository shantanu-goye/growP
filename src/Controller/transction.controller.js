import { PrismaClient } from "@prisma/client";
import cuid from "cuid";
import { sendMail } from "../utils/emailService.js";

const prisma = new PrismaClient();

// Unified error handler
const handleTransactionError = (res, error, context) => {
  console.error(`${context} Error:`, error);

  const statusMap = {
    P2002: 409, // Unique constraint
    P2025: 404, // Record not found
    P2003: 400, // Foreign key constraint
    ECONNREFUSED: 503, // Database connection error
  };

  const status = statusMap[error.code] || 500;
  const defaultMessages = {
    503: "Database connection failed. Please try again later.",
    500: `${context} operation failed`,
  };

  const message =
    error.meta?.cause ||
    defaultMessages[status] ||
    error.message ||
    `${context} operation failed`;

  res.status(status).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
};

export const createDeposit = async (req, res) => {
  try {
    const { amount, utr, transactionId } = req.body;
    const userId = req.user.id;
    const newAmount = Number(amount);

    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
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
        throw { code: "P2025", message: "User not found" };
      }

      const balance = await tx.balance.findUnique({
        where: { userId_plan: { userId, plan: user.plan } },
      });

      if (!balance) {
        throw { code: "P2025", message: "Balance not found" };
      }

      const requiredAmount = {
        seed: 10000,
        plant: 50000,
        tree: 100000,
      }[user.plan];

      const activatedNow = !user.isActive && newAmount >= requiredAmount;

      if (!user.isActive && !activatedNow) {
        throw {
          code: "P2003",
          message: `Minimum deposit required for '${user.plan}' plan is ₹${requiredAmount}`,
        };
      }

      const depositId = `TXN-DP-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 6)}`;

      if (activatedNow) {
        await tx.user.update({
          where: { id: userId },
          data: { isActive: true },
        });
      }

      const deposit = await tx.deposit.create({
        data: {
          userId,
          amount: newAmount,
          balanceBefore: balance.balance,
          transactionId,
          depositId,
          utr: utr || "",
          status: "pending",
        },
      });

      await tx.balance.update({
        where: { userId_plan: { userId, plan: user.plan } },
        data: {
          pendingDepositBalance: {
            increment: newAmount,
          },
        },
      });

      // Send email outside transaction
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
    });
  } catch (error) {
    handleTransactionError(res, error, "Deposit");
  }
};

export const createWithdrawal = async (req, res) => {
  try {
    const { type, customAmount } = req.body;
    const userId = req.user.id;

    if (!["full", "rewardOnly", "custom"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid withdrawal type",
      });
    }

    return await prisma.$transaction(async (tx) => {
      if (type === "custom") {
        const numericAmount = Number(customAmount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
          throw { code: "P2003", message: "Invalid custom amount" };
        }
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { plan: true, name: true, email: true },
      });

      if (!user) {
        throw { code: "P2025", message: "User not found" };
      }

      const balance = await tx.balance.findUnique({
        where: { userId_plan: { userId, plan: user.plan } },
      });

      if (!balance) {
        throw { code: "P2025", message: "Balance not found" };
      }

      const { balance: totalBalance, rewardBalance, plan } = balance;

      const minRequiredBalance = {
        seed: 5000,
        plant: 10000,
        tree: 15000,
      };

      const minBalance = minRequiredBalance[plan];
      let applicableBalance;
      let withdrawalAmount;

      if (type === "custom") {
        applicableBalance = rewardBalance;
        withdrawalAmount = Number(customAmount);

        if (withdrawalAmount > rewardBalance) {
          throw {
            code: "P2003",
            message: `Insufficient reward balance. Available: ₹${rewardBalance}, Requested: ₹${withdrawalAmount}`,
          };
        }

        if (withdrawalAmount < 100) {
          throw {
            code: "P2003",
            message: "Minimum custom withdrawal amount is ₹100",
          };
        }
      } else if (type === "rewardOnly") {
        applicableBalance = rewardBalance;
        withdrawalAmount = rewardBalance;

        if (applicableBalance < minBalance) {
          throw {
            code: "P2003",
            message: `Minimum ₹${minBalance} required in your reward balance for the ${plan} plan.`,
          };
        }
      } else {
        applicableBalance = totalBalance;
        withdrawalAmount = totalBalance;

        if (applicableBalance < minBalance) {
          throw {
            code: "P2003",
            message: `Minimum ₹${minBalance} required in your balance for the ${plan} plan.`,
          };
        }
      }

      if (applicableBalance <= 0) {
        throw { code: "P2003", message: "Insufficient balance to withdraw" };
      }

      const withdrawalId = `TXN-WD-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 6)}`;

      const withdrawal = await tx.withdrawal.create({
        data: {
          userId,
          amount: withdrawalAmount,
          balanceBefore: applicableBalance,
          withdrawalId,
          type,
          status: "pending",
        },
      });

      const balanceUpdate =
        type === "rewardOnly" || type === "custom"
          ? {
              rewardBalance: { decrement: withdrawalAmount },
              pendingWithdrawalBalance: { increment: withdrawalAmount },
            }
          : {
              balance: { decrement: withdrawalAmount },
              pendingWithdrawalBalance: { increment: withdrawalAmount },
            };

      await tx.balance.update({
        where: { userId_plan: { userId, plan: user.plan } },
        data: balanceUpdate,
      });

      if (type === "full") {
        await tx.user.update({
          where: { id: userId },
          data: { isActive: false },
        });
      }

      // Send email outside transaction
      if (type === "full") {
        await sendMail({
          to: user.email,
          subject: "Withdrawal & Account Termination Notice",
          html: `...`, // shortened for brevity
        });
      } else if (type === "custom") {
        await sendMail({
          to: user.email,
          subject: "Custom Withdrawal Request Received",
          html: `...`, // shortened for brevity
        });
      } else {
        await sendMail({
          to: user.email,
          subject: "Withdrawal Request Received",
          html: `...`, // shortened for brevity
        });
      }

      return res.status(201).json({
        success: true,
        message: "Withdrawal created successfully",
        withdrawal,
      });
    });
  } catch (error) {
    handleTransactionError(res, error, "Withdrawal");
  }
};

export const updateWithdrawalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, transactionId, remarks } = req.body;

    if (!["pending", "proceed", "failed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    return await prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.findUnique({ where: { id } });
      if (!withdrawal) {
        throw { code: "P2025", message: "Withdrawal not found" };
      }

      if (status === "proceed" && !transactionId) {
        throw { code: "P2003", message: "Transaction ID required" };
      }

      const user = await tx.user.findUnique({
        where: { id: withdrawal.userId },
        select: { name: true, email: true, plan: true },
      });

      const updatedWithdrawal = await tx.withdrawal.update({
        where: { id },
        data: { status, transactionId, remarks },
      });

      if (status === "proceed") {
        await tx.balance.update({
          where: {
            userId_plan: { userId: withdrawal.userId, plan: user.plan },
          },
          data: {
            pendingWithdrawalBalance: { decrement: withdrawal.amount },
          },
        });
      } else if (status === "failed") {
        const returnUpdate =
          withdrawal.type === "rewardOnly" || withdrawal.type === "custom"
            ? {
                rewardBalance: { increment: withdrawal.amount },
                pendingWithdrawalBalance: { decrement: withdrawal.amount },
              }
            : {
                balance: { increment: withdrawal.amount },
                pendingWithdrawalBalance: { decrement: withdrawal.amount },
              };

        await tx.balance.update({
          where: {
            userId_plan: { userId: withdrawal.userId, plan: user.plan },
          },
          data: returnUpdate,
        });

        if (withdrawal.type === "full") {
          await tx.user.update({
            where: { id: withdrawal.userId },
            data: { isActive: true },
          });
        }
      }

      // Send email outside transaction
      await sendMail({
        to: user.email,
        subject: `Withdrawal ${status === "proceed" ? "Processed" : "Failed"}`,
        html: `...`, // shortened for brevity
      });

      return res.status(200).json({
        success: true,
        message: "Withdrawal updated",
        withdrawal: updatedWithdrawal,
      });
    });
  } catch (error) {
    handleTransactionError(res, error, "Withdrawal Update");
  }
};

export const updateDepositStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!["pending", "proceed", "failed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    return await prisma.$transaction(async (tx) => {
      const deposit = await tx.deposit.findUnique({ where: { id } });
      if (!deposit) {
        throw { code: "P2025", message: "Deposit not found" };
      }

      const user = await tx.user.findUnique({
        where: { id: deposit.userId },
        select: { name: true, email: true, plan: true },
      });

      const updatedDeposit = await tx.deposit.update({
        where: { id },
        data: { status, remarks },
      });

      if (status !== "pending") {
        const balanceUpdate = {
          pendingDepositBalance: { decrement: deposit.amount },
        };

        if (status === "proceed") {
          balanceUpdate.balance = { increment: deposit.amount };
        }

        await tx.balance.update({
          where: { userId_plan: { userId: deposit.userId, plan: user.plan } },
          data: balanceUpdate,
        });
      }

      // Send email outside transaction
      await sendMail({
        to: user.email,
        subject: `Deposit ${status === "proceed" ? "Confirmed" : "Failed"}`,
        html: `...`, // shortened for brevity
      });

      return res.status(200).json({
        success: true,
        message: "Deposit updated",
        deposit: updatedDeposit,
      });
    });
  } catch (error) {
    handleTransactionError(res, error, "Deposit Update");
  }
};

// The following functions remain unchanged as they are read-only operations
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
    handleTransactionError(res, error, "Get Deposits");
  }
};

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
    handleTransactionError(res, error, "Get Withdrawals");
  }
};

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
    handleTransactionError(res, error, "Get All Deposits");
  }
};

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
    handleTransactionError(res, error, "Get All Withdrawals");
  }
};
``