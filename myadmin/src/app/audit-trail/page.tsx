"use client";

import * as React from "react";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/common/page-header";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { mockAuditLogs } from "@/data/mock";
import type { AuditLog } from "@/types";
import { format, parseISO } from 'date-fns';
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function AuditTrailPage() {
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredLogs = React.useMemo(() => {
    return mockAuditLogs.filter(log => 
      log.adminUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());
  }, [searchTerm]);

  return (
    <AppLayout>
      <PageHeader
        title="Audit Trail Viewer"
        description="Review logs of administrative actions performed in the system."
      />
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search logs by admin or action..."
            className="pl-8 sm:w-[300px] md:w-[300px] lg:w-[300px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Admin User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{format(parseISO(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}</TableCell>
                <TableCell className="font-medium">{log.adminUserName}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>
                  {log.metadata ? (
                    <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filteredLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No audit logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
