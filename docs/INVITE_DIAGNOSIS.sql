-- Diagnostics for invite/removal issues.
-- Replace placeholders before running.

-- 1) Resolve user_id from email.
select id, email
from profiles
where email = 'adm.symples@gmail.com';

-- 2) Check membership row.
select *
from workspace_members
where workspace_id = '0d657a6b-c0be-4e49-8cef-43ceb0a396ce'
  and user_id = 'e8b8cea3-7a95-427e-8b34-273e4e5d0752';

-- 3) Check invites for the email.
select id, workspace_id, email, status, invited_by, created_at, expires_at
from workspace_invites
where workspace_id = '0d657a6b-c0be-4e49-8cef-43ceb0a396ce'
  and email = 'adm.symples@gmail.com'
order by created_at desc;

-- 4) Check workspace slug.
select id, name, slug
from workspaces
where id = '0d657a6b-c0be-4e49-8cef-43ceb0a396ce';

-- 5) Optional: remove membership row (if needed).
delete from workspace_members
where workspace_id = '0d657a6b-c0be-4e49-8cef-43ceb0a396ce'
  and user_id = 'e8b8cea3-7a95-427e-8b34-273e4e5d0752';

-- 6) Optional: delete stale accepted invite for the email (if needed).
delete from workspace_invites
where workspace_id = '0d657a6b-c0be-4e49-8cef-43ceb0a396ce'
  and email = 'adm.symples@gmail.com'
  and status = 'accepted';
