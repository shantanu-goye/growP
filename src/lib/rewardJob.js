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
    const dayOfWeek = today.day();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log("Today is a weekend. Skipping reward crediting.");
      return;
    }

    const nonRewardDay = await prisma.nonRewardDay.findUnique({
      where: { date: today.toDate() },
    });

    if (nonRewardDay) {
      console.log(
        `Today is a non-reward day: ${
          nonRewardDay.reason || "No reason provided"
        }. Skipping.`
      );
      return;
    }

    const rewardRates = await prisma.rewardRateSetting.findMany();
    const ratesByPlan = rewardRates.reduce((acc, rate) => {
      acc[rate.plan] = rate.rate;
      return acc;
    }, /** @type {Record<PlanType, number>} */ ({}));

    const threeDaysAgo = dayjs().subtract(3, "day").toDate();
    const activeUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        createdAt: { lte: threeDaysAgo },
      },
      include: { balances: true },
    });

    console.log(`Processing ${activeUsers.length} users...`);
    let successCount = 0,
      skipCount = 0,
      errorCount = 0;

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

        const dailyReward = currentPlanBalance.balance * rewardRate;
        if (dailyReward <= 0) {
          console.log(`No reward to credit for user ${user.id}.`);
          skipCount++;
          continue;
        }

        await prisma.$transaction(async (tx) => {
          await tx.balance.update({
            where: { id: currentPlanBalance.id },
            data: {
              rewardBalance: { increment: dailyReward },
              updatedAt: new Date(),
            },
          });
        });

        console.log(`Credited ₹${dailyReward.toFixed(2)} to ${user.id}`);
        successCount++;
      } catch (err) {
        console.error(`Error crediting user ${user.id}:`, err);
        errorCount++;
      }
    }

    console.log(
      `Reward Summary → Success: ${successCount}, Skipped: ${skipCount}, Errors: ${errorCount}`
    );
    return { success: successCount, skipped: skipCount, errors: errorCount };
  } catch (err) {
    console.error("Fatal error in reward job:", err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

export function startRewardCronJob() {
  console.log("Scheduling reward job at midnight...");
  cron.schedule("0 0 * * *", async () => {
    console.log(`Cron Triggered at ${new Date().toISOString()}`);
    try {
      await creditDailyRewards();
    } catch (err) {
      console.error("Error during scheduled reward crediting:", err);
    }
  });
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
    console.log("Manual run triggered...");
    creditDailyRewards()
      .then(() => console.log("Manual reward crediting done"))
      .catch((e) => {
        console.error("Manual execution error:", e);
        process.exit(1);
      });
  }

  console.log("Reward service initialized");
}
