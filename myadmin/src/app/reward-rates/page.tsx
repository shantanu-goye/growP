"use client";

import * as React from "react";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PLAN_TYPES } from "@/lib/constants";

const rewardRatesSchema = z.object({
  seed: z.coerce.number().min(0, "Rate must be non-negative.").max(100, "Rate must be at most 100."),
  plant: z.coerce.number().min(0, "Rate must be non-negative.").max(100, "Rate must be at most 100."),
  tree: z.coerce.number().min(0, "Rate must be non-negative.").max(100, "Rate must be at most 100."),
});

type RewardRatesFormData = z.infer<typeof rewardRatesSchema>;

export default function RewardRatesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [currentRates, setCurrentRates] = React.useState<RewardRatesFormData>({
    seed: 0,
    plant: 0,
    tree: 0,
  });

  const form = useForm<RewardRatesFormData>({
    resolver: zodResolver(rewardRatesSchema),
    defaultValues: currentRates,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = form;

  // Fetch reward rates from backend
  React.useEffect(() => {
    async function fetchRates() {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:4000/api/v1/rewardRatesettings/reward-rates");
        if (!res.ok) throw new Error("Failed to fetch reward rates");
        const data = await res.json();

        // Format the data if backend doesn't return in key format (optional)
        const mapped: RewardRatesFormData = {
          seed: data.data.find((d: any) => d.plan === "seed")?.rate ?? 0,
          plant: data.data.find((d: any) => d.plan === "plant")?.rate ?? 0,
          tree: data.data.find((d: any) => d.plan === "tree")?.rate ?? 0,
        };

        setCurrentRates(mapped);
        reset(mapped);
      } catch (error) {
        toast({ title: "Error", description: "Could not load reward rates." });
      } finally {
        setLoading(false);
      }
    }

    fetchRates();
  }, [reset, toast]);

  const onSubmit = async (data: RewardRatesFormData) => {
    try {
      for (const planType of PLAN_TYPES as (keyof RewardRatesFormData)[]) {
        const rate = data[planType];
        const res = await fetch(`http://localhost:4000/api/v1/rewardRatesettings/reward-rates/${planType}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rate }),
        });
        if (!res.ok) throw new Error(`Failed to update ${planType} rate`);
      }

      setCurrentRates(data);
      reset(data);
      toast({ title: "Success", description: "Reward rates updated successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update reward rates." });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Reward Rate Configuration" description="Loading..." />
        <p className="text-center mt-10 text-muted-foreground">Loading reward rates...</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Reward Rate Configuration"
        description="Adjust global reward rates for different plans."
      />
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Set Reward Percentages</CardTitle>
          <CardDescription>
            Enter the reward rate percentages for each plan type. These rates are applied globally.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {(PLAN_TYPES as (keyof RewardRatesFormData)[]).map((planType) => (
              <div key={planType} className="space-y-2">
                <Label htmlFor={planType} className="text-lg font-medium capitalize">
                  {planType} Plan Rate (%)
                </Label>
                <div className="relative">
                  <Controller
                    name={planType}
                    control={control}
                    render={({ field }) => (
                      <Input
                        id={planType}
                        type="number"
                        step="0.01"
                        {...field}
                        value={field.value ?? ""}
                        className="pl-8"
                      />
                    )}
                  />
                  <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                {errors[planType] && (
                  <p className="text-sm text-destructive mt-1">{errors[planType]?.message}</p>
                )}
              </div>
            ))}

            <Button type="submit" className="w-full" disabled={!isDirty}>
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
