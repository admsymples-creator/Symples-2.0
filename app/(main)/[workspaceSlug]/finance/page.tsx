import { notFound } from "next/navigation";
import { getWorkspaceIdBySlug } from "@/lib/actions/tasks";
import { FinanceContent } from "../../finance/finance-content";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Server Component para a pÇ­gina de financeiro por workspace.
 * Valida o slug e renderiza o conteÇ§do com o workspace correto.
 */
export default async function WorkspaceFinancePage({ params, searchParams }: PageProps) {
  const { workspaceSlug } = await params;
  const resolvedSearchParams = await searchParams;

  const workspaceId = await getWorkspaceIdBySlug(workspaceSlug);

  if (!workspaceId) {
    return notFound();
  }

  return (
    <FinanceContent
      workspaceId={workspaceId}
      searchParams={resolvedSearchParams}
    />
  );
}
