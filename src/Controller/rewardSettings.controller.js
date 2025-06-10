import { PrismaClient } from "@prisma/client";
import { logAction } from "./auditLog.controller.js";

const prisma = new PrismaClient();

// Helper function to convert annual percentage to daily rate
const annualToDaily = (annualPercent) => annualPercent / 365;
const dailyToAnnual = (dailyRate) => dailyRate * 365;

// Reward Rate Settings CRUD
export const getRewardRates = async (req, res) => {
  try {
    const rates = await prisma.rewardRateSetting.findMany();
    
    // Convert daily rates back to annual percentages for display
    const formattedRates = rates.map(rate => ({
      ...rate,
      annualPercentage: (dailyToAnnual(rate.rate) * 100).toFixed(2) // Convert to percentage
    }));
    
    res.status(200).json({ success: true, data: formattedRates });
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
    let { rate, isAnnualPercentage = true } = req.body;
    const adminId = req.user?.id || req.headers['admin-id']; // Fix hardcoded admin
    
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
      });
    }

    rate = Number(rate);

    // Validate rate
    if (rate === undefined || rate === null || isNaN(rate)) {
      return res.status(400).json({
        success: false,
        message: "Valid rate is required",
      });
    }

    // Convert annual percentage to daily rate if needed
    if (isAnnualPercentage) {
      // Validate annual percentage (10% to 100%)
      if (rate < 10 || rate > 100) {
        return res.status(400).json({
          success: false,
          message: "Annual rate must be between 10% and 100%",
        });
      }
      // Convert percentage to decimal then to daily rate
      rate = annualToDaily(rate / 100);
    } else {
      // Direct daily rate input - validate reasonable bounds
      if (rate < 0.000274 || rate > 0.00274) { // ~10% to 100% annually
        return res.status(400).json({
          success: false,
          message: "Daily rate must be between 0.000274 and 0.00274",
        });
      }
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

    // Log the action with both daily and annual rates for clarity
    await logAction(adminId, "REWARD_RATE_UPDATE", {
      plan,
      oldDailyRate: oldRate?.rate || null,
      newDailyRate: rate,
      oldAnnualPercent: oldRate ? (dailyToAnnual(oldRate.rate) * 100).toFixed(2) : null,
      newAnnualPercent: (dailyToAnnual(rate) * 100).toFixed(2),
    });

    res.status(200).json({
      success: true,
      message: "Reward rate updated",
      data: {
        ...updatedRate,
        annualPercentage: (dailyToAnnual(rate) * 100).toFixed(2)
      },
    });
  } catch (error) {
    console.error(error);
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
    const createdBy = req.user?.id || req.headers['admin-id']; // Fix hardcoded admin

    if (!createdBy) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required",
      });
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    const nonRewardDay = await prisma.nonRewardDay.create({
      data: { date: dateObj, reason, createdBy },
    });

    // Log the action
    await logAction(createdBy, "NON_REWARD_DAY_CREATE", {
      date: dateObj,
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
    const adminId = req.user?.id || req.headers['admin-id']; // Make consistent

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
      });
    }

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