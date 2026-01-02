"use client";

import dynamic from "next/dynamic";

const PlannerClient = dynamic(
  () => import("@/components/planner/PlannerClient").then((mod) => mod.PlannerClient),
  { ssr: false }
);

export function PlannerPageClient() {
  return <PlannerClient />;
}
