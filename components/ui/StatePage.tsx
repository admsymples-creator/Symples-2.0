import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface StatePageProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
  variant?: "default" | "danger" | "warning";
  className?: string;
}

export function StatePage({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  href,
  variant = "default",
  className,
}: StatePageProps) {
  const variantStyles = {
    default: {
      icon: "text-gray-900",
      bg: "bg-gray-100",
      button: "default" as const,
    },
    danger: {
      icon: "text-red-600",
      bg: "bg-red-50",
      button: "destructive" as const,
    },
    warning: {
      icon: "text-yellow-600",
      bg: "bg-yellow-50",
      button: "default" as const, // Or add a warning variant to button if available
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[60vh] text-center px-4", className)}>
      <div className={cn("p-4 rounded-full mb-6", styles.bg)}>
        <Icon className={cn("size-16", styles.icon)} />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-500 max-w-md mx-auto mb-8">{description}</p>

      {actionLabel && (
        <>
          {href ? (
            <Button asChild variant={styles.button}>
              <Link href={href}>{actionLabel}</Link>
            </Button>
          ) : (
            <Button variant={styles.button} onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

