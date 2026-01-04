"use client";

import { getGreeting } from "@/lib/utils/greeting";

interface DynamicGreetingProps {
  userName?: string | null;
}

export function DynamicGreeting({ userName }: DynamicGreetingProps) {
  const { greeting, name } = getGreeting(userName);

  return (
    <>
      {greeting}, {name} 👋
    </>
  );
}

