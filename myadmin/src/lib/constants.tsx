import type { LucideIcon } from 'lucide-react';
import { Users, BarChart3, ListChecks, CalendarOff, Settings, } from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'User Data', icon: Users },
  { path: '/balances', label: 'Balances Overview', icon: BarChart3 },
  { path: '/transactions', label: 'Transaction Logs', icon: ListChecks },
  { path: '/non-reward-days', label: 'Non-Reward Days', icon: CalendarOff },
  { path: '/reward-rates', label: 'Reward Rates', icon: Settings },
  // { path: '/audit-trail', label: 'Audit Trail', icon: History },
];

export const APP_NAME = "Admin Panel";

export const PLAN_TYPES = ['Seed', 'Plant', 'Tree'] as const;
