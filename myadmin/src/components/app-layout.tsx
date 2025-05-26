"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NAV_ITEMS, APP_NAME } from "@/lib/constants";
import { LogOut, Building2 } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="p-4">
          <Link href="/" className="flex items-center gap-2 ">
             <Button variant="ghost" className="h-10 w-10 p-0 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
                <Building2 className="h-6 w-6 text-primary group-data-[collapsible=icon]:h-5 group-data-[collapsible=icon]:w-5" />
             </Button>
            <h1 className="text-xl font-semibold text-primary group-data-[collapsible=icon]:hidden">
              {APP_NAME}
            </h1>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <ScrollArea className="h-full">
            <SidebarMenu className="p-4 pt-0">
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <Link href={item.path} legacyBehavior passHref>
                    <SidebarMenuButton
                      isActive={pathname === item.path}
                      tooltip={{ children: item.label, side: "right", className: "ml-2" }}
                      className="justify-start"
                    >
                      <item.icon className="mr-2 h-5 w-5 group-data-[collapsible=icon]:mr-0 group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:w-4" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter className="p-4">
           <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton 
                  tooltip={{children: "Log Out", side:"right", className:"ml-2"}}
                  className="justify-start"
                >
                  <LogOut className="mr-2 h-5 w-5 group-data-[collapsible=icon]:mr-0 group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:w-4" />
                  <span className="group-data-[collapsible=icon]:hidden">Log Out</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
           </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
          <SidebarTrigger className="sm:hidden" />
          {/* Current page title can be rendered here or in each page itself */}
        </header>
        <main className="flex-1 overflow-auto p-4 sm:px-6 sm:py-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
