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
  console.log(
    `Starting daily reward crediting for ${today.format("YYYY-MM-DD")}`
  );

  try {
    // Skip weekends (0 = Sunday, 6 = Saturday)
    const dayOfWeek = today.day();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log("Today is a weekend. Skipping reward crediting.");
      return { success: 0, skipped: 0, errors: 0, reason: "Weekend" };
    }

    // Check for non-reward days
    const nonRewardDay = await prisma.nonRewardDay.findUnique({
      where: { date: today.toDate() },
    });

    if (nonRewardDay) {
      console.log(
        `Today is a non-reward day: ${
          nonRewardDay.reason || "No reason provided"
        }. Skipping.`
      );
      return {
        success: 0,
        skipped: 0,
        errors: 0,
        reason: `Non-reward day: ${nonRewardDay.reason}`,
      };
    }

    // Get reward rates
    const rewardRates = await prisma.rewardRateSetting.findMany();
    const ratesByPlan = rewardRates.reduce((acc, rate) => {
      acc[rate.plan] = rate.rate;
      return acc;
    }, /** @type {Record<PlanType, number>} */ ({}));

    // Validate that we have reward rates configured
    if (Object.keys(ratesByPlan).length === 0) {
      console.log("No reward rates configured. Skipping reward crediting.");
      return {
        success: 0,
        skipped: 0,
        errors: 0,
        reason: "No reward rates configured",
      };
    }

    // Get active users (excluding those created in last 3 days)
    const threeDaysAgo = dayjs().subtract(3, "day").toDate();
    const activeUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        createdAt: { lte: threeDaysAgo },
      },
      include: { balances: true },
    });

    console.log(`Processing ${activeUsers.length} users...`);
    console.log(
      `Reward rates configured:`,
      Object.entries(ratesByPlan)
        .map(
          ([plan, rate]) =>
            `${plan}: ${(rate * 365 * 100).toFixed(
              2
            )}% annually (${rate.toFixed(6)} daily)`
        )
        .join(", ")
    );

    let successCount = 0,
      skipCount = 0,
      errorCount = 0;
    const processedUsers = [];

    for (const user of activeUsers) {
      try {
        const currentPlanBalance = user.balances.find(
          (b) => b.plan === user.plan
        );

        if (!currentPlanBalance) {
          console.log(`User ${user.id} has no balance for plan ${user.plan}.`);
          skipCount++;
          continue;
        }

        const rewardRate = ratesByPlan[user.plan];
        if (rewardRate === undefined) {
          console.log(
            `No reward rate set for ${user.plan}. Skipping user ${user.id}.`
          );
          skipCount++;
          continue;
        }

        // Handle zero reward rate (admin can set 0% rate to pause rewards)
        if (rewardRate === 0) {
          console.log(
            `Reward rate is 0% for ${user.plan}. Skipping user ${user.id}.`
          );
          skipCount++;
          continue;
        }

        // Calculate daily reward
        const dailyReward = currentPlanBalance.balance * rewardRate;

        if (dailyReward <= 0) {
          console.log(
            `No reward to credit for user ${user.id} (balance: ₹${currentPlanBalance.balance}).`
          );
          skipCount++;
          continue;
        }

        // Credit the reward in a transaction
        await prisma.$transaction(async (tx) => {
          const updatedBalance = await tx.balance.update({
            where: { id: currentPlanBalance.id },
            data: {
              rewardBalance: { increment: dailyReward },
              updatedAt: new Date(),
            },
          });

          // Log the reward transaction for audit
          await tx.rewardTransaction.create({
            data: {
              userId: user.id,
              plan: user.plan,
              principalAmount: currentPlanBalance.balance,
              rewardRate: rewardRate,
              rewardAmount: dailyReward,
              creditedAt: new Date(),
              balanceId: currentPlanBalance.id,
            },
          });

          return updatedBalance;
        });

        processedUsers.push({
          userId: user.id,
          plan: user.plan,
          principalAmount: currentPlanBalance.balance,
          rewardAmount: dailyReward,
          annualRate: `${(rewardRate * 365 * 100).toFixed(2)}%`,
        });

        console.log(
          `✓ User ${user.id} (${
            user.plan
          }): ₹${currentPlanBalance.balance.toFixed(2)} × ${(
            rewardRate *
            365 *
            100
          ).toFixed(2)}% = ₹${dailyReward.toFixed(2)}`
        );
        successCount++;
      } catch (err) {
        console.error(`✗ Error crediting user ${user.id}:`, err);
        errorCount++;
      }
    }

    const summary = {
      date: today.format("YYYY-MM-DD"),
      success: successCount,
      skipped: skipCount,
      errors: errorCount,
      totalProcessed: activeUsers.length,
      totalRewarded: processedUsers.reduce((sum, u) => sum + u.rewardAmount, 0),
      processedUsers: processedUsers,
    };

    console.log(
      `Reward Summary → Success: ${successCount}, Skipped: ${skipCount}, Errors: ${errorCount}`
    );
    console.log(`Total Rewards Credited: ₹${summary.totalRewarded.toFixed(2)}`);

    return summary;
  } catch (err) {
    console.error("Fatal error in reward job:", err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

export function startRewardCronJob() {
  console.log("Scheduling reward job at midnight IST...");

  // Run at midnight IST (UTC+5:30) - adjust cron accordingly
  cron.schedule("30 10 * * *", async () => {
    // 10:30 UTC = 16:00 IST
    // 18:30 UTC = 00:00 IST
    console.log(`Cron Triggered at ${new Date().toISOString()}`);
    try {
      const result = await creditDailyRewards();
      console.log("Scheduled reward crediting completed:", result);
    } catch (err) {
      console.error("Error during scheduled reward crediting:", err);

      // Optional: Send alert/notification to admin
      // await sendAlertToAdmin("Reward job failed", err.message);
    }
  });

  console.log("Reward cron job scheduled successfully");
}

// Manual execution function for testing/admin triggers
export async function runRewardJobManually() {
  console.log("Manual reward job execution started...");
  try {
    const result = await creditDailyRewards();
    console.log("Manual reward crediting completed:", result);
    return result;
  } catch (error) {
    console.error("Manual execution error:", error);
    throw error;
  }
}

// Entry point if run directly
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
    console.log("Manual run triggered via command line...");
    runRewardJobManually()
      .then((result) => {
        console.log("Manual reward crediting done:", result);
        process.exit(0);
      })
      .catch((e) => {
        console.error("Manual execution error:", e);
        process.exit(1);
      });
  }

  console.log("Reward service initialized and running...");
}
