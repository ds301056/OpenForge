"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  InboxIcon,
  CalendarDaysIcon,
  SettingsIcon,
  MapIcon,
  TargetIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import type { Goal } from "@/types";

const navItems = [
  { title: "Today", href: "/today", icon: HomeIcon },
  { title: "Goals", href: "/goals", icon: InboxIcon },
  { title: "Calendar", href: "/calendar", icon: CalendarDaysIcon },
  { title: "Settings", href: "/settings", icon: SettingsIcon },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);

  useEffect(() => {
    fetch("/api/goals?status=active")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setActiveGoals(data);
      })
      .catch(() => {});
  }, []);

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <MapIcon className="h-6 w-6" />
          <span className="text-lg font-bold">OpenForge</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {activeGoals.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Active Goals</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {activeGoals.map((goal) => (
                  <SidebarMenuItem key={goal.id}>
                    <SidebarMenuButton
                      render={<Link href={`/plan/${goal.id}`} />}
                      isActive={pathname === `/plan/${goal.id}`}
                    >
                      <TargetIcon className="h-4 w-4" />
                      <span className="truncate">{goal.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="px-4 py-2">
        <p className="text-xs text-muted-foreground">OpenForge v0.1</p>
      </SidebarFooter>
    </Sidebar>
  );
}
