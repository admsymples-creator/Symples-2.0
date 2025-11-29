import { Suspense } from "react";
import { getUserProfile } from "@/lib/actions/user";
import { SettingsPageClient } from "./settings-client";

export default async function SettingsPage() {
  const user = await getUserProfile();

  return (
    <Suspense fallback={
      <div className="container max-w-5xl py-10 mx-auto">
        <div className="flex flex-col gap-2 mb-8">
          <div className="h-9 w-64 bg-gray-200 animate-pulse rounded" />
          <div className="h-5 w-96 bg-gray-100 animate-pulse rounded" />
        </div>
        <div className="h-96 bg-gray-50 animate-pulse rounded-lg" />
      </div>
    }>
      <SettingsPageClient user={user} />
    </Suspense>
  );
}
