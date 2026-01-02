import { redirect } from "next/navigation";
import { getUserWorkspaces } from "@/lib/actions/user";

export default async function FinancePage() {
  const workspaces = await getUserWorkspaces();

  if (workspaces.length === 0) {
    return redirect("/onboarding");
  }

  const workspace = workspaces[0];
  const slug = workspace.slug || workspace.id;
  return redirect(`/${slug}/finance`);
}
