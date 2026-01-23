"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type WorkspaceItem = {
  id: string;
  name: string;
  slug: string | null;
  logo_url?: string | null;
};

type WorkspacesContextValue = {
  workspaces: WorkspaceItem[];
  setWorkspaces: React.Dispatch<React.SetStateAction<WorkspaceItem[]>>;
};

const WorkspacesContext = createContext<WorkspacesContextValue | null>(null);

export function WorkspacesProvider({
  workspaces,
  children,
}: {
  workspaces: WorkspaceItem[];
  children: React.ReactNode;
}) {
  const [state, setState] = useState<WorkspaceItem[]>(workspaces);
  const value = useMemo(
    () => ({ workspaces: state, setWorkspaces: setState }),
    [state]
  );

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
  return context.workspaces;
}

export function useWorkspacesManager() {
  const context = useContext(WorkspacesContext);
  if (!context) {
    return {
      setWorkspaces: (_: React.SetStateAction<WorkspaceItem[]>) => {},
    };
  }
  return { setWorkspaces: context.setWorkspaces };
}
