# RBAC Matrix

This document defines the canonical enterprise authorization model for the SaaS. The source of truth in code is `src/lib/security/permissions.ts`; server-side tenant enforcement is performed through `src/server/security/rbac.ts` and `src/server/security/api-guards.ts`.

## Roles

| Role | Intent |
| --- | --- |
| `owner` | Full organization control, billing, team, settings, exports, audit and all operational workflows. |
| `admin` | Full organization administration for enterprise operations. Same permission set as owner until ownership transfer is implemented as a separate privileged flow. |
| `editor` | Can manage operational compliance records and create exports, but cannot manage billing, team, settings or audit access. |
| `member` | Can contribute documents and read operational compliance records. Cannot perform privileged administration, exports or sensitive mutations outside document contribution. |
| `viewer` | Read-only access to operational compliance records. Cannot mutate, export, manage billing/team/settings or read audit logs. |

## Permission matrix

| Permission | Owner | Admin | Editor | Member | Viewer |
| --- | --- | --- | --- | --- | --- |
| `manage_billing` | yes | yes | no | no | no |
| `manage_team` | yes | yes | no | no | no |
| `manage_documents` | yes | yes | yes | yes | no |
| `read_documents` | yes | yes | yes | yes | yes |
| `manage_vendors` | yes | yes | yes | no | no |
| `read_vendors` | yes | yes | yes | yes | yes |
| `manage_risks` | yes | yes | yes | no | no |
| `read_risks` | yes | yes | yes | yes | yes |
| `manage_ai_governance` | yes | yes | yes | no | no |
| `read_ai_governance` | yes | yes | yes | yes | yes |
| `manage_ai_incidents` | yes | yes | yes | no | no |
| `read_ai_incidents` | yes | yes | yes | yes | yes |
| `read_audit` | yes | yes | no | no | no |
| `export_data` | yes | yes | yes | no | no |
| `manage_settings` | yes | yes | no | no | no |

## Engineering rules

1. New app routes, API routes and server actions must use the canonical permission names above.
2. Do not create route-local permission maps.
3. Do not authorize a resource by ID alone. Every access must validate `organization_id`, membership and the required permission server-side.
4. Do not trust `organization_id` from client input until the authenticated user membership has been verified server-side.
5. Sensitive denied checks should return generic errors and no-store responses; RBAC denials should be audit logged on a best-effort basis.

## Validation

The matrix is covered by:

- `tests/unit/enterprise-rbac-surface.test.ts`
- `tests/unit/permissions.test.ts`
- `src/server/security/api-guards.test.ts`
