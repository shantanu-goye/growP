import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function repairBalances() {
  try {
    const users = await prisma.user.findMany({
      include: {
        deposits: true,
        withdrawals: true,
        balances: true,
      },
    });

    await prisma.$transaction(async (tx) => {
      for (const user of users) {
        const { id: userId, email, balances, deposits, withdrawals } = user;

        // Calculate total deposited and withdrawn
        const totalDeposits = deposits.reduce((sum, dep) => sum + dep.amount, 0);
        const totalWithdrawals = withdrawals.reduce((sum, wd) => sum + wd.amount, 0);
        const actualBalance = parseFloat((totalDeposits - totalWithdrawals).toFixed(2));

        // Determine the most recently updated balance entry (if any)
        const latestBalance = balances.reduce((latest, current) => {
          return (!latest || new Date(current.updatedAt) > new Date(latest.updatedAt)) ? current : latest;
        }, null);

        // If no previous balance exists, default the values
        const latestPlan = latestBalance?.plan || user.plan;
        const rewardBalance = latestBalance?.rewardBalance || 0;
        const pendingDepositBalance = latestBalance?.pendingDepositBalance || 0;
        const pendingWithdrawalBalance = latestBalance?.pendingWithdrawalBalance || 0;

        // Delete all old balances
        await tx.balance.deleteMany({ where: { userId } });

        // Create new corrected balance
        await tx.balance.create({
          data: {
            userId,
            plan: latestPlan,
            balance: actualBalance,
            rewardBalance,
            pendingDepositBalance,
            pendingWithdrawalBalance,
          },
        });

        console.log(`✅ Repaired balance for ${email}`);
      }
    });

    console.log("\n🎉 All balances have been successfully repaired.");
  } catch (error) {
    console.error("❌ Error during balance repair:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

repairBalances();
