"use client";

import * as React from "react";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { mockUsers, calculatePlanBalances } from "@/data/mock";
import type { PlanBalance } from "@/types";
import { Users, DollarSign, TrendingUp } from "lucide-react";

export default function BalancesOverviewPage() {
  const [planBalances, setPlanBalances] = React.useState<PlanBalance[]>([]);

  React.useEffect(() => {
    setPlanBalances(calculatePlanBalances(mockUsers));
  }, []);

  const getPlanIcon = (planType: 'Seed' | 'Plant' | 'Tree') => {
    switch(planType) {
      case 'Seed': return <TrendingUp className="h-6 w-6 text-muted-foreground" />;
      case 'Plant': return <TrendingUp className="h-6 w-6 text-muted-foreground" />; // Could use different icons
      case 'Tree': return <TrendingUp className="h-6 w-6 text-muted-foreground" />;
      default: return <DollarSign className="h-6 w-6 text-muted-foreground" />;
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Balances Overview"
        description="Summary of total balances for each plan type."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {planBalances.map((plan) => (
          <Card key={plan.planType} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-bold text-primary">{plan.planType} Plan</CardTitle>
              {getPlanIcon(plan.planType)}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                ${plan.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <Users className="h-4 w-4 mr-1" />
                {plan.userCount} users
              </p>
            </CardContent>
          </Card>
        ))}
        {planBalances.length === 0 && (
            <Card>
                <CardHeader>
                    <CardTitle>No Balance Data</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>There is no balance data available to display.</p>
                </CardContent>
            </Card>
        )}
      </div>
    </AppLayout>
  );
}
