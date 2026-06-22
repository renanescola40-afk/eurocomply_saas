# Access control

Status: current access-control documentation for enterprise review. This document must stay aligned with `src/server/security/rbac.ts`, middleware behavior, and Supabase RLS migrations.

## Authentication

EuroComply uses Supabase Auth for user sessions. Middleware checks authenticated state for non-public localized routes and redirects anonymous users to `/{locale}/login` with the original destination preserved in the `next` query parameter. Server-side helpers call Supabase `auth.getUser()` before sensitive user-specific behavior.

## Public and private routes

Public routes are explicitly allowlisted in middleware. Trust, security, compliance, data processing, SLA, privacy, terms, DPA, subprocessors, and status pages are public. Dashboard and organization workspace routes are private unless explicitly listed otherwise.

## Organization membership

Authorization is organization-scoped. The RBAC module loads membership from `organization_members` by `organization_id` and `user_id`. If no membership exists, access is denied with a 403 response. Authorization failures are best-effort audited as `security.failure` events.

## Roles

Current normalized organization roles are:

| Role | Intended use |
| --- | --- |
| `owner` | Full organization administration, billing, team, settings, read/write/export. |
| `admin` | Full operational administration similar to owner. |
| `editor` | Target role for operational write access in the Trust Center RBAC model. Some legacy server paths may still rely on owner/admin/member checks until they are migrated to the shared RBAC helper. |
| `member` | Limited operational contribution and read access. |
| `viewer` | Target role for read-only access in the Trust Center RBAC model. Some legacy server paths may still rely on owner/admin/member checks until they are migrated to the shared RBAC helper. |

Unknown or unsupported role labels normalize to `viewer` to avoid privilege escalation. Customer-facing claims about `editor` and `viewer` must be scoped to flows that use the shared RBAC helper and must not describe legacy owner/admin/member-only paths as fully migrated.

## Permissions

Current permission names are defined in code and include:

- `manage_billing`
- `manage_team`
- `manage_documents`
- `read_documents`
- `manage_vendors`
- `read_vendors`
- `manage_risks`
- `read_risks`
- `manage_ai_governance`
- `read_ai_governance`
- `manage_ai_incidents`
- `read_ai_incidents`
- `read_audit`
- `export_data`
- `manage_settings`

## RLS relationship

Application RBAC and Supabase RLS are complementary. RBAC is used in server-side product flows to decide whether an authenticated member may perform an action. RLS is the database-level tenant boundary for authenticated database access. Service-role paths bypass RLS and therefore must remain server-only and separately reviewed.

## Enterprise gaps

Enterprise SSO/SAML is planned but not currently available. Tenant-enforced MFA is planned but not currently available as an organization policy. Fine-grained custom roles are not currently documented as available beyond the implemented Trust Center RBAC model, and legacy owner/admin/member-only flows must be treated as migration gaps until they explicitly use the shared RBAC helper.

## Customer-safe answer

Use: "EuroComply currently implements organization-scoped roles and permissions for owner, admin, member, and Trust Center RBAC-model editor/viewer access where flows use the shared RBAC helper, backed by server-side membership checks and Supabase RLS migrations. Some legacy server paths are still owner/admin/member-only and are tracked as migration gaps. Enterprise SSO/SAML and tenant-enforced MFA are roadmap items and must not be presented as available until implemented."
