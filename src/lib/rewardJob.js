// rewardJob.js
import { PrismaClient, PlanType } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import cron from "node-cron";

// Extend dayjs
dayjs.extend(utc);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const prisma = new PrismaClient();

export async function creditDailyRewards() {
  const today = dayjs().utc().startOf("day");
  console.log(`Starting daily reward crediting for ${today.format("YYYY-MM-DD")}`);

  const nonRewardDay = await prisma.nonRewardDay.findUnique({ where: { date: today.toDate() } });
  if (nonRewardDay) {
    console.log(`Non-reward day: ${nonRewardDay.reason || "No reason"}`);
    return { success: 0, skipped: 0, errors: 0, reason: `Non-reward day: ${nonRewardDay.reason}` };
  }

  const rewardRates = await prisma.rewardRateSetting.findMany();
  const ratesByPlan = rewardRates.reduce((acc, rate) => {
    acc[rate.plan] = rate.rate;
    return acc;
  }, /** @type {Record<PlanType, number>} */({}));

  if (Object.keys(ratesByPlan).length === 0) {
    console.log("No reward rates configured. Skipping.");
    return { success: 0, skipped: 0, errors: 0, reason: "No reward rates" };
  }

  const activeUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      createdAt: { lte: dayjs().subtract(3, "day").toDate() },
    },
    include: { balances: true },
  });

  console.log(`Processing ${activeUsers.length} users...`);

  let success = 0, skipped = 0, errors = 0;
  const processed = [];

  for (const user of activeUsers) {
    try {
      const balance = user.balances.find((b) => b.plan === user.plan);
      const rate = ratesByPlan[user.plan];

      if (!balance || rate === undefined || rate === 0 || balance.balance <= 0) {
        console.log(`Skipping user ${user.id} due to missing data or zero rate.`);
        skipped++;
        continue;
      }

      const reward = balance.balance * rate;

      await prisma.$transaction(async (tx) => {
        await tx.balance.update({
          where: { id: balance.id },
          data: {
            rewardBalance: { increment: reward },
            updatedAt: new Date(),
          },
        });

        await tx.rewardTransaction.create({
          data: {
            userId: user.id,
            plan: user.plan,
            principalAmount: balance.balance,
            rewardRate: rate,
            rewardAmount: reward,
            creditedAt: new Date(),
            balanceId: balance.id,
          },
        });
      });

      success++;
      processed.push({ userId: user.id, plan: user.plan, reward });
      console.log(`✓ Credited ₹${reward.toFixed(2)} to user ${user.id}`);
    } catch (err) {
      console.error(`✗ Error for user ${user.id}:`, err);
      errors++;
    }
  }

  const totalRewarded = processed.reduce((sum, u) => sum + u.reward, 0);
  const summary = {
    date: today.format("YYYY-MM-DD"),
    success,
    skipped,
    errors,
    totalProcessed: activeUsers.length,
    totalRewarded,
    processedUsers: processed,
  };

  console.log("Reward summary:", summary);
  return summary;
}

export function startRewardCronJob() {
  console.log("Scheduling reward job for 00:00 IST...");
  cron.schedule("30 18 * * *", async () => {
    console.log(`Cron Triggered at ${new Date().toISOString()}`);
    try {
      const result = await creditDailyRewards();
      console.log("Cron reward completed:", result);
    } catch (err) {
      console.error("Scheduled reward job error:", err);
    }
  });
}

export async function runRewardJobManually() {
  console.log("Manual reward job execution started...");
  try {
    const result = await creditDailyRewards();
    console.log("Manual reward job completed:", result);
    return result;
  } catch (err) {
    console.error("Manual execution error:", err);
    throw err;
  }
}

if (process.argv[1] === import.meta.url) {
  process.on("SIGINT", async () => {
    console.log("SIGINT → Shutting down...");
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("SIGTERM → Shutting down...");
    await prisma.$disconnect();
    process.exit(0);
  });

  startRewardCronJob();

  if (process.argv.includes("--run-now")) {
    runRewardJobManually()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }

  console.log("Reward service initialized and running...");
}