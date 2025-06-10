import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixUserBalances() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        balances: true,
      },
    });

    const validPlans = ["seed", "plant", "tree"];

    for (const user of users) {
      const currentPlan = user.plan?.toLowerCase();
      if (!validPlans.includes(currentPlan)) {
        console.log(`Skipping user ${user.id} (${user.email}): invalid current plan`);
        continue;
      }

      const allBalances = user.balances;

      let totalBalance = 0;
      let totalReward = 0;
      let totalPendingDeposit = 0;
      let totalPendingWithdrawal = 0;

      // Aggregate all balances
      for (const bal of allBalances) {
        totalBalance += bal.balance || 0;
        totalReward += bal.rewardBalance || 0;
        totalPendingDeposit += bal.pendingDepositBalance || 0;
        totalPendingWithdrawal += bal.pendingWithdrawalBalance || 0;
      }

      // Zero out all balances first
      for (const bal of allBalances) {
        await prisma.balance.update({
          where: {
            userId_plan: {
              userId: user.id,
              plan: bal.plan,
            },
          },
          data: {
            balance: 0,
            rewardBalance: 0,
            pendingDepositBalance: 0,
            pendingWithdrawalBalance: 0,
            updatedAt: new Date(),
          },
        });
      }

      // Upsert cleaned and consolidated balance into current plan
      await prisma.balance.upsert({
        where: {
          userId_plan: {
            userId: user.id,
            plan: currentPlan,
          },
        },
        update: {
          balance: totalBalance,
          rewardBalance: totalReward,
          pendingDepositBalance: totalPendingDeposit,
          pendingWithdrawalBalance: totalPendingWithdrawal,
          updatedAt: new Date(),
        },
        create: {
          userId: user.id,
          plan: currentPlan,
          balance: totalBalance,
          rewardBalance: totalReward,
          pendingDepositBalance: totalPendingDeposit,
          pendingWithdrawalBalance: totalPendingWithdrawal,
        },
      });

      console.log(
        `✅ Fixed balances for ${user.email}: assigned all to ${currentPlan} plan`
      );
    }

    console.log("🎉 All user balances have been reconciled.");
  } catch (err) {
    console.error("❌ Error fixing balances:", err);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserBalances();
