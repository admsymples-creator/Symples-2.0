"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarProps {
    name: string;
    avatar?: string;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function Avatar({ name, avatar, size = "sm", className }: AvatarProps) {
    const sizeClasses = {
        sm: "w-6 h-6 text-xs",
        md: "w-8 h-8 text-sm",
        lg: "w-10 h-10 text-base",
    };

    const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <div
            className={cn(
                "rounded-full bg-gray-200 flex items-center justify-center overflow-hidden",
                sizeClasses[size],
                className
            )}
            title={name}
        >
            {avatar ? (
                <img src={avatar} alt={name} className="w-full h-full object-cover" />
            ) : (
                <span className="text-gray-600 font-medium">{initials}</span>
            )}
        </div>
    );
}

interface AvatarGroupProps {
    users: Array<{ name: string; avatar?: string }>;
    max?: number;
    size?: "sm" | "md" | "lg";
}

export function AvatarGroup({ users, max = 3, size = "sm" }: AvatarGroupProps) {
    const visibleUsers = users.slice(0, max);
    const remaining = users.length - max;

    return (
        <div className="flex items-center -space-x-2">
            {visibleUsers.map((user, index) => (
                <Avatar
                    key={index}
                    name={user.name}
                    avatar={user.avatar}
                    size={size}
                    className="border-2 border-white"
                />
            ))}
            {remaining > 0 && (
                <div
                    className={cn(
                        "rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-gray-600 font-medium",
                        size === "sm" ? "w-6 h-6 text-xs" : size === "md" ? "w-8 h-8 text-sm" : "w-10 h-10 text-base"
                    )}
                    title={`+${remaining} mais`}
                >
                    +{remaining}
                </div>
            )}
        </div>
    );
}

