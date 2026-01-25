-- Diagnostics for invite/removal issues.
-- Replace placeholders before running.

-- 1) Resolve user_id from email.
select id, email
from profiles
where email = '<EMAIL>';

-- 2) Check membership row.
select *
from workspace_members
where workspace_id = '<WORKSPACE_ID>'
  and user_id = '<USER_ID>';

-- 3) Check invites for the email.
select id, workspace_id, email, status, invited_by, created_at, expires_at
from workspace_invites
where workspace_id = '<WORKSPACE_ID>'
  and email = '<EMAIL>'
order by created_at desc;

-- 4) Check workspace slug.
select id, name, slug
from workspaces
where id = '<WORKSPACE_ID>';

-- 5) Optional: remove membership row (if needed).
delete from workspace_members
where workspace_id = '<WORKSPACE_ID>'
  and user_id = '<USER_ID>';

-- 6) Optional: delete stale accepted invite for the email (if needed).
delete from workspace_invites
where workspace_id = '<WORKSPACE_ID>'
  and email = '<EMAIL>'
  and status = 'accepted';
