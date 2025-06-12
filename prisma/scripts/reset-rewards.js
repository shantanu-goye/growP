// prisma/scripts/reset-rewards.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetRewards() {
  try {
    const result = await prisma.balance.updateMany({
      data: {
        rewardBalance: 0,
      },
    });

    console.log("✅ Rewards reset successfully for all users.");
    console.log("Rows affected:", result.count);
  } catch (error) {
    console.error("❌ Error resetting rewards:", error);
  } finally {
    await prisma.$disconnect();
  }
}

resetRewards();
