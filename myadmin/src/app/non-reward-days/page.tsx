"use client";

import * as React from "react";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calender";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { mockNonRewardDays } from "@/data/mock";
// import type { NonRewardDay } from "@/types";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO, isValid } from 'date-fns';
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
const nonRewardDaySchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  reason: z.string().min(3, "Reason must be at least 3 characters long."),
});

type NonRewardDay = {
  id: string;
  date: string;
  reason: string;
};

type NonRewardDayFormData = z.infer<typeof nonRewardDaySchema>;

export default function NonRewardDaysPage() {
  const { toast } = useToast();
  const [nonRewardDays, setNonRewardDays] = React.useState<NonRewardDay[]>([]);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<NonRewardDayFormData>({
    resolver: zodResolver(nonRewardDaySchema),
    defaultValues: { date: undefined, reason: "" },
  });

  React.useEffect(() => {
    fetchNonRewardDays();
  }, []);

  const fetchNonRewardDays = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/v1/rewardRatesettings/non-reward-days");
      const data = await res.json();
      setNonRewardDays(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load non-reward days." });
    }
  };

  const onSubmit = async (data: NonRewardDayFormData) => {
    try {
      const res = await fetch("http://localhost:4000/api/v1/rewardRatesettings/non-reward-days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: format(data.date, "yyyy-MM-dd"),
          reason: data.reason,
        }),
      });
      if (res.ok) {
        toast({ title: "Success", description: "Non-reward day added." });
        reset();
        fetchNonRewardDays();
      } else {
        toast({ title: "Error", description: "Could not add day." });
      }
    } catch (err) {
      toast({ title: "Error", description: "Network error." });
    }
  };

  const removeNonRewardDay = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/rewardRatesettings/non-reward-days/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Success", description: "Non-reward day removed." });
        fetchNonRewardDays();
      } else {
        toast({ title: "Error", description: "Could not delete day." });
      }
    } catch (err) {
      toast({ title: "Error", description: "Network error." });
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Non-Reward Day Manager" description="Manage days on which rewards are not distributed." />
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="text-lg font-semibold mb-4">Add New Non-Reward Day</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Date</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left", !field.value && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
  <Calendar
    mode="single"
    selected={field.value}
    onSelect={field.onChange}
    initialFocus
  />
</PopoverContent>

                  </Popover>
                )}
              />
              {errors.date && <p className="text-sm text-destructive mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <Label>Reason</Label>
              <Controller
                name="reason"
                control={control}
                render={({ field }) => <Input placeholder="e.g., Public Holiday" {...field} />}
              />
              {errors.reason && <p className="text-sm text-destructive mt-1">{errors.reason.message}</p>}
            </div>
            <Button type="submit"><PlusCircle className="mr-2 h-4 w-4" /> Add Entry</Button>
          </form>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Current Non-Reward Days</h3>
          {nonRewardDays.length > 0 ? (
            <div className="rounded-md border max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nonRewardDays.map((day) => (
                    <TableRow key={day.id}>
                      <TableCell>{isValid(parseISO(day.date)) ? format(parseISO(day.date), "MMM dd, yyyy") : "Invalid Date"}</TableCell>
                      <TableCell>{day.reason}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this entry.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeNonRewardDay(day.id)} className="bg-destructive">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground">No non-reward days configured.</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
