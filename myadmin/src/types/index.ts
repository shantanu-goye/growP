export interface User {
  id: string;
  name: string;
  email: string;
  accountNumber: string;
  planType: 'Seed' | 'Plant' | 'Tree';
  balance: number;
  joinDate: string; // ISO string format for date
}

export interface PlanBalance {
  planType: 'Seed' | 'Plant' | 'Tree';
  totalBalance: number;
  userCount: number;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string; 
  type: 'Deposit' | 'Withdrawal';
  amount: number;
  status: 'Pending' | 'Completed' | 'Failed';
  timestamp: string; // ISO string format for date
}

export interface NonRewardDay {
  id: string;
  date: string; // ISO string format for date
  reason: string;
}

export interface RewardRates {
  seed: number;    // Percentage
  plant: number;   // Percentage
  tree: number;    // Percentage
}

export interface AuditLog {
  id: string;
  adminUserName: string;
  action: string;
  timestamp: string; // ISO string format for date
  metadata?: Record<string, unknown>; // safer than `any`
}
