# Dashboard Data Model Migration

The current dashboard still reads from the legacy workspace-oriented model.

## Current dashboard dependencies

The dashboard at `src/app/[locale]/dashboard/page.tsx` currently uses:

- `workspace_members`
- `workspaces`
- `ai_tools`
- `ai_assessments`
- `compliance_documents`

## Target SaaS model

The new SaaS foundation uses:

- `organization_members`
- `organizations`
- `compliance_tasks`
- `documents`
- `vendors`
- `risks`
- `audit_logs`
- `subscriptions`

## Migration rule

New functionality should be built against `organizations`, not `workspaces`.

Legacy dashboard code should be migrated incrementally instead of rewritten in one large change.

## Recommended sequence

1. Add an organization-scoped dashboard route or container.
2. Replace workspace membership lookup with `organization_members`.
3. Replace workspace object with `organizations`.
4. Replace AI inventory widgets with compliance task, vendor, risk, and document widgets.
5. Replace legacy audit logs with `audit_logs`.
6. Remove workspace tables only after no route depends on them.

## Risk

The project currently has two competing domain models. Keeping both long-term will increase security risk, development cost, and product confusion.
