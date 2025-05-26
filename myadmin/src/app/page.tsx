"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

import * as React from "react"
import { AppLayout } from "@/components/app-layout"
import { PageHeader } from "@/components/common/page-header"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, PlusCircle, Search } from "lucide-react"
import { format, parseISO } from "date-fns"
import type { User } from "@/types"

type SortKey = keyof User | ""
type SortOrder = "asc" | "desc"

export default function UserDataGridPage() {
  const [users, setUsers] = React.useState<User[]>([])
  const [searchTerm, setSearchTerm] = React.useState("")
  const [sortKey, setSortKey] = React.useState<SortKey>("")
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc")

  // Fetch data from API
  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/v1/user/auth/users", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        })
        const data = await res.json()
        setUsers(data.users || [])
      } catch (error) {
        console.error("Failed to fetch users:", error)
      }
    }

    fetchUsers()
  }, [])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortOrder("asc")
    }
  }

  const filteredUsers = React.useMemo(() => {
    let filtered = [...users]

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.accountNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (sortKey) {
      filtered.sort((a, b) => {
        const valA = a[sortKey]
        const valB = b[sortKey]

        if (typeof valA === "number" && typeof valB === "number") {
          return sortOrder === "asc" ? valA - valB : valB - valA
        }

        if (typeof valA === "string" && typeof valB === "string") {
          return sortOrder === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA)
        }

        return 0
      })
    }

    return filtered
  }, [users, searchTerm, sortKey, sortOrder])

  const getSortIcon = (key: SortKey) => (
    <ArrowUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 group-hover:opacity-100" />
  )

  return (
    <AppLayout>
      <PageHeader title="User Data" description="Manage and view user details.">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add User
        </Button>
      </PageHeader>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search users..."
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
              {["name", "email", "accountNumber", "planType", "balance", "joinDate"].map((key) => (
                <TableHead
                  key={key}
                  className="cursor-pointer group"
                  onClick={() => handleSort(key as SortKey)}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}{" "}
                  {getSortIcon(key as SortKey)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.accountNumber}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      user.plan === "Seed"
                        ? "secondary"
                        : user.plan === "Plant"
                        ? "outline"
                        : "default"
                    }
                  >
                    {user.plan}
                  </Badge>
                </TableCell>
                <TableCell className="text-left">
  ${user.balance?.toFixed(2) ?? "0.00"}
</TableCell>

                <TableCell>{format(parseISO(user.createdAt), "MMM dd, yyyy")}</TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  )
}
