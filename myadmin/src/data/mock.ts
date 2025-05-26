import type { User, Transaction, NonRewardDay, RewardRates, AuditLog, PlanBalance } from '@/types';
import { formatISO } from 'date-fns';

export const mockUsers: User[] = [
  { id: '1', name: 'Alice Wonderland', email: 'alice@example.com', accountNumber: 'ACC001', planType: 'Tree', balance: 15000.75, joinDate: formatISO(new Date(2023, 0, 15)) },
  { id: '2', name: 'Bob The Builder', email: 'bob@example.com', accountNumber: 'ACC002', planType: 'Plant', balance: 7500.50, joinDate: formatISO(new Date(2023, 2, 10)) },
  { id: '3', name: 'Charlie Brown', email: 'charlie@example.com', accountNumber: 'ACC003', planType: 'Seed', balance: 1200.00, joinDate: formatISO(new Date(2023, 5, 20)) },
  { id: '4', name: 'Diana Prince', email: 'diana@example.com', accountNumber: 'ACC004', planType: 'Tree', balance: 25000.00, joinDate: formatISO(new Date(2022, 11, 5)) },
  { id: '5', name: 'Edward Scissorhands', email: 'edward@example.com', accountNumber: 'ACC005', planType: 'Plant', balance: 5000.25, joinDate: formatISO(new Date(2023, 8, 1)) },
];

export const mockTransactions: Transaction[] = [
  { id: 't1', userId: '1', userName: 'Alice Wonderland', type: 'Deposit', amount: 5000, status: 'Completed', timestamp: formatISO(new Date(2023, 10, 1)) },
  { id: 't2', userId: '2', userName: 'Bob The Builder', type: 'Withdrawal', amount: 1000, status: 'Pending', timestamp: formatISO(new Date(2023, 10, 5)) },
  { id: 't3', userId: '3', userName: 'Charlie Brown', type: 'Deposit', amount: 200, status: 'Completed', timestamp: formatISO(new Date(2023, 9, 12)) },
  { id: 't4', userId: '1', userName: 'Alice Wonderland', type: 'Withdrawal', amount: 500, status: 'Failed', timestamp: formatISO(new Date(2023, 10, 8)) },
  { id: 't5', userId: '4', userName: 'Diana Prince', type: 'Deposit', amount: 10000, status: 'Completed', timestamp: formatISO(new Date(2023, 7, 15)) },
];

export const mockNonRewardDays: NonRewardDay[] = [
  { id: 'nr1', date: formatISO(new Date(2023, 11, 25)), reason: 'Christmas Day' },
  { id: 'nr2', date: formatISO(new Date(2024, 0, 1)), reason: 'New Year\'s Day' },
];

export const mockRewardRates: RewardRates = {
  seed: 0.5,
  plant: 1.0,
  tree: 1.5,
};

export const mockAuditLogs: AuditLog[] = [
  { id: 'al1', adminUserName: 'AdminUser1', action: 'User "Charlie Brown" created.', timestamp: formatISO(new Date(2023, 5, 20, 10, 0, 0)) },
  { id: 'al2', adminUserName: 'AdminUser2', action: 'Withdrawal #t2 for "Bob The Builder" ($1000) initiated.', timestamp: formatISO(new Date(2023, 10, 5, 14, 30, 0)) },
  { id: 'al3', adminUserName: 'AdminUser1', action: 'Reward rates updated: Seed to 0.55%.', timestamp: formatISO(new Date(2023, 10, 6, 9, 15, 0)), metadata: { oldRate: 0.5, newRate: 0.55, plan: 'Seed'} },
  { id: 'al4', adminUserName: 'AdminUser1', action: 'Non-reward day "2024-01-01" added (New Year\'s Day).', timestamp: formatISO(new Date(2023, 10, 7, 11, 0, 0)) },
];

export const calculatePlanBalances = (users: User[]): PlanBalance[] => {
  const balances: Record<string, { totalBalance: number; userCount: number }> = {
    Seed: { totalBalance: 0, userCount: 0 },
    Plant: { totalBalance: 0, userCount: 0 },
    Tree: { totalBalance: 0, userCount: 0 },
  };

  users.forEach(user => {
    if (balances[user.planType]) {
      balances[user.planType].totalBalance += user.balance;
      balances[user.planType].userCount++;
    }
  });

  return Object.entries(balances).map(([planType, data]) => ({
    planType: planType as 'Seed' | 'Plant' | 'Tree',
    ...data,
  }));
};
