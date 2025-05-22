import { PrismaClient } from "@prisma/client";
import { logAction } from "./auditLog.controller.js";

const prisma = new PrismaClient();

// Reward Rate Settings CRUD
export const getRewardRates = async (req, res) => {
  try {
    const rates = await prisma.rewardRateSetting.findMany();
    res.status(200).json({ success: true, data: rates });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch reward rates",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const updateRewardRate = async (req, res) => {
  try {
    const { plan } = req.params;
    const { rate } = req.body;
    const adminId = req.user.id;

    if (!rate || isNaN(rate)) {
      return res.status(400).json({
        success: false,
        message: "Valid rate is required",
      });
    }

    // Get old rate for audit logging
    const oldRate = await prisma.rewardRateSetting.findUnique({
      where: { plan },
    });

    const updatedRate = await prisma.rewardRateSetting.upsert({
      where: { plan },
      update: { rate },
      create: { plan, rate },
    });

    // Log the action
    await logAction(adminId, "REWARD_RATE_UPDATE", {
      plan,
      oldRate: oldRate?.rate || null,
      newRate: rate,
    });

    res.status(200).json({
      success: true,
      message: "Reward rate updated",
      data: updatedRate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update reward rate",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Non Reward Days CRUD
export const getNonRewardDays = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const days = await prisma.nonRewardDay.findMany({
      where,
      orderBy: { date: "desc" },
    });

    res.status(200).json({ success: true, data: days });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch non-reward days",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const createNonRewardDay = async (req, res) => {
  try {
    const { date, reason } = req.body;
    const createdBy = req.user.id; // Assuming admin user is authenticated

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required",
      });
    }

    const nonRewardDay = await prisma.nonRewardDay.create({
      data: { date: new Date(date), reason, createdBy },
    });

    // Log the action
    await logAction(createdBy, "NON_REWARD_DAY_CREATE", {
      date: new Date(date),
      reason,
      nonRewardDayId: nonRewardDay.id,
    });

    res.status(201).json({
      success: true,
      message: "Non-reward day created",
      data: nonRewardDay,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "Non-reward day already exists for this date",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to create non-reward day",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const deleteNonRewardDay = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    // Get the non-reward day details before deletion for audit logging
    const nonRewardDay = await prisma.nonRewardDay.findUnique({
      where: { id },
    });

    if (!nonRewardDay) {
      return res.status(404).json({
        success: false,
        message: "Non-reward day not found",
      });
    }

    await prisma.nonRewardDay.delete({ where: { id } });

    // Log the action
    await logAction(adminId, "NON_REWARD_DAY_DELETE", {
      nonRewardDayId: id,
      date: nonRewardDay.date,
      reason: nonRewardDay.reason,
    });

    res.status(200).json({
      success: true,
      message: "Non-reward day deleted",
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Non-reward day not found",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to delete non-reward day",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
