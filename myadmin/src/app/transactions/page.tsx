"use client";

import * as React from "react";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/common/page-header";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { Search } from "lucide-react";

type TransactionType = "Deposit" | "Withdrawal";
type TransactionStatus = "Pending" | "Completed" | "Failed";

interface Transaction {
  id: string;
  userName: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  timestamp: string;
}

export default function TransactionLogsPage() {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");

  React.useEffect(() => {
    const fetchTransactions = async () => {
  try {
    const [depositRes, withdrawalRes] = await Promise.all([
      fetch("http://localhost:4000/api/v1/transactions/admin/deposits"),
      fetch("http://localhost:4000/api/v1/transactions/admin/withdrawals"),
    ]);

    if (!depositRes.ok || !withdrawalRes.ok) {
      throw new Error("API request failed");
    }

    const depositJson = await depositRes.json();
    const withdrawalJson = await withdrawalRes.json();

    const deposits = depositJson.deposits;
    const withdrawals = withdrawalJson.withdrawals;

    const depositData: Transaction[] = deposits.map((d: any) => ({
      id: d.id,
      userName: d.user.name,
      type: "Deposit",
      amount: d.amount,
      status: d.status,
      timestamp: d.createdAt,
    }));

    const withdrawalData: Transaction[] = withdrawals.map((w: any) => ({
      id: w.id,
      userName: w.user.name,
      type: "Withdrawal",
      amount: w.amount,
      status: w.status,
      timestamp: w.createdAt,
    }));

    const allTransactions = [...depositData, ...withdrawalData].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setTransactions(allTransactions);
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
  }
};

    fetchTransactions();
  }, []);

  const filteredTransactions = React.useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch =
        transaction.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || transaction.status === statusFilter;
      const matchesType = typeFilter === "all" || transaction.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [searchTerm, statusFilter, typeFilter, transactions]);

  return (
    <AppLayout>
      <PageHeader
        title="Transaction Logs"
        description="View and filter deposit and withdrawal records."
      />
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by user or ID..."
            className="pl-8 w-full sm:w-[300px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Deposit">Deposit</SelectItem>
            <SelectItem value="Withdrawal">Withdrawal</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">{transaction.id}</TableCell>
                <TableCell>{transaction.userName}</TableCell>
                <TableCell>
                  <Badge
                    variant={transaction.type === "Deposit" ? "default" : "secondary"}
                    className={
                      transaction.type === "Deposit"
                        ? "bg-green-500/20 text-green-700 hover:bg-green-500/30"
                        : "bg-red-500/20 text-red-700 hover:bg-red-500/30"
                    }
                  >
                    {transaction.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  ${transaction.amount.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      transaction.status === "Completed"
                        ? "default"
                        : transaction.status === "Pending"
                        ? "outline"
                        : "destructive"
                    }
                  >
                    {transaction.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(parseISO(transaction.timestamp), "MMM dd, yyyy HH:mm")}
                </TableCell>
              </TableRow>
            ))}
            {filteredTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
