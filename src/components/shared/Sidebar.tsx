"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Settings,
    MessageSquare,
    Bell,
    ChevronLeft,
    Activity,
    Moon,
    Sun,
    LogOut,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";

const navItems = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        label: "Ask a Question",
        href: "/dashboard/ask",
        icon: MessageSquare,
    },
    {
        label: "Alerts",
        href: "/dashboard/alerts",
        icon: Bell,
    },
    {
        label: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const { data: session } = useSession();
    const [collapsed, setCollapsed] = useState(false);

    const userInitials = session?.user?.name
        ? session.user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : "?";

    return (
        <aside
            className={cn(
                "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
                collapsed ? "w-[68px]" : "w-[240px]"
            )}
        >
            {/* Logo */}
            <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Activity className="h-5 w-5" />
                </div>
                {!collapsed && (
                    <div className="animate-fade-in overflow-hidden">
                        <p className="text-sm font-semibold leading-tight text-sidebar-foreground">
                            Business Health
                        </p>
                        <p className="text-[11px] text-muted-foreground">Interpreter</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex flex-1 flex-col gap-1 p-3">
                {navItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname?.startsWith(item.href));

                    const linkContent = (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-primary/10 text-primary shadow-sm"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "h-[18px] w-[18px] shrink-0 transition-colors",
                                    isActive
                                        ? "text-primary"
                                        : "text-muted-foreground group-hover:text-accent-foreground"
                                )}
                            />
                            {!collapsed && (
                                <span className="animate-fade-in truncate">{item.label}</span>
                            )}
                        </Link>
                    );

                    if (collapsed) {
                        return (
                            <Tooltip key={item.href}>
                                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                                <TooltipContent side="right" sideOffset={8}>
                                    {item.label}
                                </TooltipContent>
                            </Tooltip>
                        );
                    }

                    return linkContent;
                })}
            </nav>

            {/* Footer */}
            <div className="border-t border-sidebar-border p-3 space-y-1">
                {/* User info */}
                {session?.user && (
                    <div
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2",
                            collapsed && "justify-center px-0"
                        )}
                    >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                            {userInitials}
                        </div>
                        {!collapsed && (
                            <div className="animate-fade-in overflow-hidden min-w-0">
                                <p className="truncate text-xs font-medium text-foreground">
                                    {session.user.name}
                                </p>
                                <p className="truncate text-[10px] text-muted-foreground">
                                    {session.user.email}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Theme toggle */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className={cn(
                        "w-full justify-start gap-3 text-muted-foreground hover:text-foreground",
                        collapsed && "justify-center px-0"
                    )}
                >
                    <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    {!collapsed && <span className="animate-fade-in">Toggle theme</span>}
                </Button>

                {/* Sign out */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className={cn(
                        "w-full justify-start gap-3 text-muted-foreground hover:text-destructive",
                        collapsed && "justify-center px-0"
                    )}
                >
                    <LogOut className="h-[18px] w-[18px]" />
                    {!collapsed && <span className="animate-fade-in">Sign out</span>}
                </Button>

                {/* Collapse toggle */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCollapsed(!collapsed)}
                    className={cn(
                        "w-full justify-start gap-3 text-muted-foreground hover:text-foreground",
                        collapsed && "justify-center px-0"
                    )}
                >
                    <ChevronLeft
                        className={cn(
                            "h-[18px] w-[18px] transition-transform duration-300",
                            collapsed && "rotate-180"
                        )}
                    />
                    {!collapsed && <span className="animate-fade-in">Collapse</span>}
                </Button>
            </div>
        </aside>
    );
}
