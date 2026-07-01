# RISCK COMPLY Sales Console MVP

Status: MVP implemented for Early Access internal operations  
Owner: Product Engineering / Revenue Operations  
Last reviewed: 2026-07-01

## What this is

The Sales Console is a small internal lead operations surface for RISCK COMPLY. It helps the internal team handle demo requests, Early Access trials and enterprise follow-up from the existing public lead capture flow.

It is intentionally a **mini CRM for internal use**, not a public customer-facing CRM product and not an enterprise CRM claim.

## What this is not

The Sales Console is not:

- a Salesforce replacement
- a HubSpot replacement
- a customer-facing CRM module
- a marketing automation suite
- a multi-tenant CRM feature for client organizations
- a claim that RISCK COMPLY includes enterprise CRM functionality

The product remains focused on AI compliance, AI governance, EU AI Act readiness, evidence, documents, vendors, tasks, billing and organization workflows.

## MVP scope

The MVP adds:

- internal list page at `/[locale]/admin/sales/leads`
- internal detail page at `/[locale]/admin/sales/leads/[id]`
- platform-admin guard separate from customer organization roles
- lead filters by status, priority, source and company/email search
- pipeline metrics for new, qualified, demo scheduled, proposal sent, won and lost leads
- status updates
- priority updates
- next follow-up updates
- internal notes
- activity timeline
- loading, empty and generic error states
- no-store rendering and no-store redirects for sensitive pages/actions
- server-side Supabase admin access only after app-layer authorization

## Outside MVP scope

Do not add these until there is clear revenue-operations need and legal/privacy review:

- public CRM marketing copy
- customer-facing CRM pages
- bulk lead export
- AI lead scoring
- enrichment from third-party data brokers
- marketing sequences
- quota dashboards
- multi-pipeline customization
- two-way CRM sync that can overwrite internal compliance data

## Data model

The existing `sales_leads` table remains the source of truth for captured leads. The MVP expands it with minimal commercial fields:

- `status`
- `priority`
- `owner_user_id`
- `next_follow_up_at`
- `last_contacted_at`
- `estimated_value_cents`
- `currency`
- `plan_interest`
- `lost_reason`
- `updated_at`

The MVP also adds `sales_lead_activities` for commercial activity history:

- `note`
- `status_change`
- `follow_up`
- `email`
- `call`
- `demo`
- `proposal`

RLS is enabled. No public policies are created. Direct `anon` and `authenticated` access is revoked for internal sales tables.

## Personal data and privacy

Lead records can contain personal/commercial data, including:

- name
- work email
- company
- role
- message/current process
- IP hint
- user-agent
- internal notes
- follow-up timestamps

Rules for handling this data:

- do not render lead data in normal customer dashboards
- do not log email, original messages, notes, IP hints or user-agent values in application errors
- use generic client-facing errors and redirects
- keep internal notes concise and avoid unnecessary sensitive data
- keep pages and mutation responses no-store
- use retention/redaction before any broad export or CRM sync

## Allowed statuses

The internal pipeline uses these statuses only:

- `new`
- `qualified`
- `demo_scheduled`
- `proposal_sent`
- `won`
- `lost`
- `nurture`

## Allowed priorities

The internal priority field uses these values only:

- `low`
- `normal`
- `high`
- `urgent`

## Security model

Access requires:

1. authenticated user
2. platform/internal admin membership in `platform_admin_users`
3. allowed role, currently `owner` or `sales_admin`
4. server-side access through the Supabase service role after authorization

Customer organization members do not receive access through `organization_members`, even if they are tenant admins.

Mutations also use:

- trusted origin checks
- distributed rate limit
- bounded form body checks
- Zod validation
- note body length limit
- follow-up date validation
- activity metadata length limit
- safe error redirects without internal details
- audit logging for important lead operations
- database constraints for status, priority, non-negative estimated value and sensitive text length limits

## Local testing

Run the focused checks:

```bash
npm ci
npm run test -- src/server/queries/sales-leads.test.ts src/server/sales/lead-operations.test.ts
npm run lint
npm run typecheck
npm run build
```

Manual verification:

1. Apply Supabase migrations locally.
2. Insert a controlled platform admin row into `platform_admin_users` for your test user.
3. Create a lead through the public Book Demo form or `/api/leads`.
4. Visit `/pt/admin/sales/leads` while authenticated as that platform admin.
5. Confirm the lead list renders, filters work and the detail page opens.
6. Change status, priority and follow-up.
7. Add a note.
8. Confirm `sales_lead_activities` contains the status/follow-up/note events.
9. Confirm `audit_logs` contains the internal operation event without lead PII in metadata beyond state transitions.
10. Log in as a normal customer organization user and confirm the admin sales pages redirect away.
11. Confirm normal dashboard pages do not render `sales_leads` data.
12. Submit `/api/leads` and confirm public Book Demo flow still works.

## Release checklist

Before merging:

- `npm ci` succeeds with the committed lockfile
- focused Sales Console tests pass
- lint passes
- typecheck passes
- production build passes
- Supabase migration applies cleanly to a staging database
- no public `sales_leads` or `sales_lead_activities` policies are introduced
- no public marketing page calls this an enterprise CRM product

## Future evolution

After Early Access, keep the RISCK COMPLY product clean and integrate with a dedicated CRM instead of rebuilding one internally.

Recommended next steps:

- outbound webhook to HubSpot or Pipedrive when a lead is captured
- one-way sync of status and owner from CRM back into `sales_leads`
- optional enrichment using approved processors only
- lead retention/redaction workflow
- admin-only export with audit trail if legally approved

Avoid adding heavy CRM concepts until there is real sales volume: custom pipelines, quota dashboards, marketing sequences, bulk import/export, workflow automation and AI scoring are outside this MVP.
