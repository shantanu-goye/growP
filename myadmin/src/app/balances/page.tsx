"use client"

import * as React from "react"
import { AppLayout } from "@/components/app-layout"
import { PageHeader } from "@/components/common/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, DollarSign, Leaf, TreePalm, Sprout } from "lucide-react"
import type { User, PlanBalance } from "@/types"

export default function BalancesOverviewPage() {
  const [planBalances, setPlanBalances] = React.useState<PlanBalance[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("https://app.growp.in/api/v1/user/auth/users", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        })

        const data = await res.json()
        const users: User[] = data.users || []

        // Aggregate balance by plan
        const planMap: Record<string, { totalBalance: number; userCount: number }> = {}

        for (const user of users) {
          const plan = user.plan || "Unknown"
          const balance = typeof user.balance === "number" ? user.balance : 0

          if (!planMap[plan]) {
            planMap[plan] = { totalBalance: 0, userCount: 0 }
          }

          planMap[plan].totalBalance += balance
          planMap[plan].userCount += 1
        }

        const aggregatedBalances: PlanBalance[] = Object.entries(planMap).map(
          ([planType, { totalBalance, userCount }]) => ({
            planType,
            totalBalance,
            userCount,
          })
        )

        setPlanBalances(aggregatedBalances)
      } catch (error) {
        console.error("Failed to fetch users or compute balances", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case "Seed":
        return <Sprout className="h-6 w-6 text-muted-foreground" />
      case "Plant":
        return <Leaf className="h-6 w-6 text-muted-foreground" />
      case "Tree":
        return <TreePalm className="h-6 w-6 text-muted-foreground" />
      default:
        return <DollarSign className="h-6 w-6 text-muted-foreground" />
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Balances Overview"
        description="Summary of total balances for each plan type."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <Card>
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Fetching balance data.</p>
            </CardContent>
          </Card>
        ) : planBalances.length > 0 ? (
          planBalances.map((plan) => (
            <Card
              key={plan.planType}
              className="shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold text-primary">
                  {plan.planType} Plan
                </CardTitle>
                {getPlanIcon(plan.planType)}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  ${plan.totalBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <Users className="h-4 w-4 mr-1" />
                  {plan.userCount} users
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
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
  )
}
