export function buildProjectTags(currentTags: string[] | undefined, nextProject: string | null): string[] {
  const tags = Array.isArray(currentTags) ? [...currentTags] : [];
  const currentProject = tags.length > 0 ? tags[0] : null;
  const rest = currentProject ? tags.slice(1).filter((tag) => tag !== currentProject) : tags;

  if (!nextProject) {
    return rest;
  }

  const dedupedRest = rest.filter((tag) => tag !== nextProject);
  return [nextProject, ...dedupedRest];
}
