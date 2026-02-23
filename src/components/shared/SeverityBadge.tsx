"use client";

import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { IssueSeverity } from "@/lib/types";

interface SeverityBadgeProps {
    severity: IssueSeverity;
    className?: string;
    showIcon?: boolean;
    size?: "sm" | "default";
}

const severityConfig = {
    critical: {
        label: "Critical",
        icon: AlertTriangle,
        className:
            "bg-severity-critical/10 text-severity-critical border-severity-critical/20 hover:bg-severity-critical/15",
    },
    warning: {
        label: "Warning",
        icon: AlertCircle,
        className:
            "bg-severity-warning/10 text-severity-warning border-severity-warning/20 hover:bg-severity-warning/15",
    },
    info: {
        label: "Info",
        icon: Info,
        className:
            "bg-severity-info/10 text-severity-info border-severity-info/20 hover:bg-severity-info/15",
    },
};

export function SeverityBadge({
    severity,
    className,
    showIcon = true,
    size = "default",
}: SeverityBadgeProps) {
    const config = severityConfig[severity];
    const Icon = config.icon;

    return (
        <Badge
            variant="outline"
            className={cn(
                "gap-1 font-medium transition-colors",
                config.className,
                size === "sm" && "px-1.5 py-0 text-[10px]",
                className
            )}
        >
            {showIcon && (
                <Icon className={cn("shrink-0", size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")} />
            )}
            {config.label}
        </Badge>
    );
}
