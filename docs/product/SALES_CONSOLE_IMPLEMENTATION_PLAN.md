# RISCK COMPLY Sales Console Implementation Plan

Status: MVP implemented for Early Access internal operations  
Owner: Product Engineering / Revenue Operations  
Scope: Early Access internal lead operations  
Last reviewed: 2026-07-01

## 1. Decision

RISCK COMPLY uses a small internal **Sales Console** for lead follow-up. This is intentionally a mini CRM for internal operations, not a customer-facing CRM module and not an enterprise CRM claim.

The SaaS remains focused on AI compliance, AI governance, EU AI Act readiness, inventories, risk classification, documents, tasks, vendors, reports, billing, teams and audit logs.

## 2. Implemented MVP

Implemented surfaces:

- `src/app/[locale]/admin/sales/leads/page.tsx`
- `src/app/[locale]/admin/sales/leads/[id]/page.tsx`
- route handlers under `src/app/[locale]/admin/sales/leads/[id]/*/route.ts`
- `src/server/queries/sales-leads.ts`
- `src/server/sales/lead-operations.ts`
- `src/server/security/platform-admin.ts`
- `supabase/migrations/20260701103000_sales_console_mvp.sql`

Implemented capabilities:

- list leads with filters by status, priority, source and company/email search
- lead metrics for new, qualified, demo scheduled, proposal sent, won and lost
- lead detail page
- status updates
- priority updates
- next follow-up updates
- internal notes
- activity timeline
- automatic activity record on status change
- loading and error states
- server-side platform admin guard
- no-store rendering for sensitive admin pages
- safe mutation redirects without internal error leaks

## 3. Database model

`public.sales_leads` is expanded with minimal commercial fields:

- `status text not null default 'new'`
- `priority text not null default 'normal'`
- `owner_user_id uuid null`
- `next_follow_up_at timestamptz null`
- `last_contacted_at timestamptz null`
- `estimated_value_cents integer null`
- `currency text not null default 'EUR'`
- `plan_interest text null`
- `lost_reason text null`
- `updated_at timestamptz not null default now()`

`public.sales_lead_activities` is created for timeline events:

- `id uuid primary key default gen_random_uuid()`
- `lead_id uuid not null references sales_leads(id) on delete cascade`
- `created_at timestamptz not null default now()`
- `created_by uuid null`
- `type text not null`
- `body text not null`
- `metadata jsonb not null default '{}'`

Allowed activity types:

- `note`
- `status_change`
- `follow_up`
- `email`
- `call`
- `demo`
- `proposal`

## 4. Status model

Allowed Sales Console statuses:

- `new`
- `qualified`
- `demo_scheduled`
- `proposal_sent`
- `won`
- `lost`
- `nurture`

These replace earlier broader CRM-style statuses such as `contacted`, `trial_started`, `customer` and `disqualified` for the internal MVP UI/actions.

## 5. Security model

Sales Console access requires:

1. authenticated user
2. platform/internal admin membership through `platform_admin_users`
3. role allowed by `requirePlatformAdmin`, currently `owner` or `sales_admin`
4. server-side query/mutation through Supabase admin client only after app-layer authorization

Customer organization membership does not grant access. Normal tenant admins must not see leads.

RLS is enabled on internal tables and no public policies are created. The migration revokes direct access for `anon` and `authenticated` on internal sales/admin tables.

Mutations use:

- trusted origin guard
- distributed rate limit
- Zod validation
- UUID validation
- note body limit of 2,000 characters
- audit event logging for important operations
- safe redirects on failure

## 6. Explicit non-goals

Do not implement in this release:

- public CRM feature
- customer-facing sales dashboard
- Salesforce/HubSpot clone
- marketing automation
- outbound sequences
- lead scoring AI
- forecasting and quotas
- custom pipelines
- bulk import/export
- heavy CRM dependencies

## 7. Validation before merge

Run:

```bash
npm run test -- src/server/queries/sales-leads.test.ts src/server/sales/lead-operations.test.ts
npm run typecheck
npm run build
```

Manual smoke:

1. Apply migrations.
2. Add a controlled row in `platform_admin_users` for the internal test user.
3. Submit a demo lead through `/api/leads` or the public Book Demo form.
4. Open `/pt/admin/sales/leads` as platform admin.
5. Confirm metrics, filters, empty state and table render.
6. Open a lead detail page.
7. Change status and confirm a `sales_lead_activities` row with `type = 'status_change'`.
8. Add a note and confirm a `sales_lead_activities` row with `type = 'note'`.
9. Log in as a normal organization member and confirm access is denied/redirected.

## 8. Evolution path

After Early Access, avoid turning RISCK COMPLY into a CRM. Evolve via integration:

- send lead-created webhook to HubSpot/Pipedrive
- optionally sync CRM stage back to `sales_leads.status`
- keep sensitive lead operations internal
- add retention/redaction workflow before large-scale sales use

## 9. Acceptance criteria

- `/api/leads` remains unchanged and continues to capture public leads.
- Sales Console is not linked from the normal customer dashboard.
- Leads are only accessible to platform/internal admins.
- Internal mutations create activity records and audit events.
- No dependencies are added.
- No CRM enterprise claims are introduced.
- Typecheck, tests and build remain green.
