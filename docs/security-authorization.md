# EuroComply Authorization Matrix

EuroComply is organization-first. Every protected business object must be scoped by `organization_id`, and every request must verify that the current user belongs to the organization before reading or mutating data.

## Roles

| Role | Purpose |
| --- | --- |
| `owner` | Full organization control, billing, team management, audit access and operational work. |
| `admin` | Full operational and billing management, except ownership transfer flows when introduced. |
| `member` | Day-to-day compliance operations without billing, organization settings or destructive delete privileges. |

## Permission matrix

| Permission | Owner | Admin | Member |
| --- | --- | --- | --- |
| Read organization | Yes | Yes | Yes |
| Update organization | Yes | Yes | No |
| Read team | Yes | Yes | Yes |
| Invite members | Yes | Yes | No |
| Remove members | Yes | Yes | No |
| Manage billing | Yes | Yes | No |
| Read documents | Yes | Yes | Yes |
| Create/update documents | Yes | Yes | Yes |
| Delete documents | Yes | Yes | No |
| Read vendors | Yes | Yes | Yes |
| Create/update vendors | Yes | Yes | Yes |
| Delete vendors | Yes | Yes | No |
| Read risks | Yes | Yes | Yes |
| Create/update risks | Yes | Yes | Yes |
| Delete risks | Yes | Yes | No |
| Read tasks | Yes | Yes | Yes |
| Create/update tasks | Yes | Yes | Yes |
| Delete tasks | Yes | Yes | No |
| Read reports | Yes | Yes | Yes |
| Create exports | Yes | Yes | Yes |
| Read audit logs | Yes | Yes | No |

## Implementation notes

- Use `src/lib/security/permissions.ts` for role-level permission checks.
- Server actions and API routes must still verify organization membership from the database. The helper is a policy definition, not a substitute for membership lookup.
- All Supabase queries for tenant-owned records must include `.eq('organization_id', organization.id)` or enforce equivalent RLS policies.
- Service-role Supabase clients bypass RLS, so actions using `createAdminClient()` must be especially strict about membership checks.
- Exports must require a current user, current organization membership, and rate limiting.
- Billing and team-management flows must be owner/admin only.

## Storage rules

- Document storage must remain private.
- Paths should include `organization_id` and avoid user-controlled path traversal.
- Signed URLs should have short expirations and be generated only after membership checks.

## V1 security checklist

- [ ] Verify all server actions check membership before mutation.
- [ ] Verify all API routes check authentication and organization scope.
- [ ] Verify all CSV exports are organization-scoped and rate limited.
- [ ] Verify document upload and download paths cannot cross organization boundaries.
- [ ] Verify owner/admin/member role behavior with tests.
- [ ] Review Supabase RLS policies for all tenant-owned tables.
