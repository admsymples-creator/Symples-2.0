"use client";

import React, { createContext, useContext, useMemo } from "react";

type WorkspaceItem = {
  id: string;
  name: string;
  slug: string | null;
  logo_url?: string | null;
};

const WorkspacesContext = createContext<WorkspaceItem[] | null>(null);

export function WorkspacesProvider({
  workspaces,
  children,
}: {
  workspaces: WorkspaceItem[];
  children: React.ReactNode;
}) {
  const value = useMemo(() => workspaces, [workspaces]);

  return (
    <WorkspacesContext.Provider value={value}>
      {children}
    </WorkspacesContext.Provider>
  );
}

export function useWorkspaces() {
  const context = useContext(WorkspacesContext);
  if (!context) {
    return [];
  }
  return context;
}
