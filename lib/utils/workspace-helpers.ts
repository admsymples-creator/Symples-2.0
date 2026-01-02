/**
 * Verifica se um workspace é o workspace pessoal do usuário
 * Usa múltiplas heurísticas para ser mais robusto que apenas verificar o nome
 */
export function isPersonalWorkspace(
  workspace: { id: string; name: string; slug: string | null } | null | undefined,
  allWorkspaces: Array<{ id: string; name: string; slug: string | null }> = []
): boolean {
  if (!workspace) return false;

  const nameLower = (workspace.name || "").trim().toLowerCase();
  const slugLower = (workspace.slug || "").trim().toLowerCase();

  // Heurística 1: Nome é "Pessoal" (case-insensitive)
  if (nameLower === "pessoal") return true;

  // Heurística 2: Slug começa com "pessoal-"
  if (slugLower.startsWith("pessoal-")) return true;

  // Heurística 3: Se é o único workspace e tem características de pessoal
  if (allWorkspaces.length === 1 && allWorkspaces[0].id === workspace.id) {
    // Se é o único workspace, assumir que é pessoal se o nome ou slug sugerem isso
    if (nameLower.includes("pessoal") || slugLower.includes("pessoal")) {
      return true;
    }
  }

  return false;
}

