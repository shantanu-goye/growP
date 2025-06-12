// scripts/reset-rewards.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetRewards() {
  try {
    // Update all reward balances to zero
    const result = await prisma.balance.updateMany({
      data: {
        rewardBalance: 0,
      },
    });

    console.log(`✅ Reward balances reset for ${result.count} users.`);

    // Optional: Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'REWARD_RESET',
        metadata: {
          reason: 'Manual reset of all reward balances to ₹0 on production',
        },
      },
    });

    console.log('📝 Audit log entry created.');
  } catch (error) {
    console.error('❌ Error resetting reward balances:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetRewards();
