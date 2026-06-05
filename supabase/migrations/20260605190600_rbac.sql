create table if not exists public.permissions (
  key text primary key,
  description text not null
);

create table if not exists public.role_permissions (
  role text not null,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role, permission_key)
);

insert into public.permissions (key, description) values
  ('organization.manage', 'Manage organization settings'),
  ('members.manage', 'Invite and manage organization members'),
  ('billing.manage', 'Manage billing and subscription'),
  ('audit_logs.read', 'Read organization audit logs'),
  ('compliance.manage', 'Manage compliance workspace')
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_key) values
  ('owner', 'organization.manage'),
  ('owner', 'members.manage'),
  ('owner', 'billing.manage'),
  ('owner', 'audit_logs.read'),
  ('owner', 'compliance.manage'),
  ('admin', 'members.manage'),
  ('admin', 'audit_logs.read'),
  ('admin', 'compliance.manage'),
  ('compliance_manager', 'compliance.manage'),
  ('viewer', 'audit_logs.read')
on conflict do nothing;
