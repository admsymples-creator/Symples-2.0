export interface AdminUserRow {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  whatsapp: string | null
  created_at: string | null
  account_plan: string | null
  primaryWorkspace: {
    id: string
    name: string
    slug: string
    plan: string | null
    subscription_status: string | null
    trial_ends_at: string | null
    member_limit: number | null
  } | null
  primaryMembership: {
    role: string
    workspace_id: string
  } | null
  primaryWorkspaceMemberCount: number
}

export interface AdminWorkspaceRow {
  id: string
  name: string
  slug: string
  plan: string | null
  subscription_status: string | null
  trial_ends_at: string | null
  member_limit: number | null
  created_at: string | null
  owner_id: string | null
  owner: {
    full_name: string | null
    email: string
  } | null
  members: Array<{ count: number }>
}

export interface AdminAuditLogRow {
  id: string
  action: string
  user_id: string | null
  details: Record<string, unknown> | null
  created_at: string | null
  admin_profile?: {
    full_name: string | null
    email: string
  } | null
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AdminTableParams {
  page?: number
  pageSize?: number
  sort?: string
  order?: "asc" | "desc"
  q?: string
  plan?: string
  status?: string
}
