# Enterprise backlog

This file is the **current prioritized backlog**, not the historical completion log. Completed repository work remains attributable through Git history, merged PRs and exact-SHA evidence. Stale completed items must not outrank a live P0.

Current synchronized baseline before #1815: `main@75151c463ea7bf54c74e4dc9e5cd3af995615eae`.

| ID | Domain | Priority | Problem | Acceptance criteria | Dependencies | Status | Authority | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ENT-022 | Production / Vercel | **P0** | Current Vercel Production deployment is `READY`, but project reports `live=false` and canonical `/api/health` returns HTTP `402 DEPLOYMENT_DISABLED`. | Restore the existing project through a zero-cost/configuration/account-state remedy; canonical health returns `200`; exact serving SHA is attributable; Production smoke/runtime evidence is rebound. If any payment/plan change is required, stop for owner decision. | Existing Vercel account state; #1814 | **ACTIVE P0** | #1814 | Owner / SRE / Control Tower |
| ENT-023 | Release / Supabase | P0 | Governed Supabase Production promotion remains separate from repository readiness and requires protected exact-SHA authority. | Execute only the #1631 protected sequence on an exact serving release with accepted prerequisites, independent review and separate explicit Production-write authorization; verify postconditions and live RLS/tenant evidence. | #1814 serving recovery; #1631; #1610; #198 | BLOCKED / HUMAN-PROTECTED | #1631 | Owner / Security / SRE |
| ENT-024 | Billing / Stripe | P0 | Genuine LIVE commercial lifecycle has not yet been accepted as final customer evidence. | Observe a legitimate normal Production customer lifecycle and signed provider events without synthetic customer/payment creation; reconcile durable entitlement state on the exact accepted serving release. | Serving Production; real customer event | EXTERNAL EVENT REQUIRED | #1609 | Billing / Owner |
| ENT-025 | External Security Assurance | P0 | Independent pentest engagement, execution and retest acceptance remain open. | Independent attributable report, High/Critical remediation and retest closure under approved ROE. No active testing before written authorization; no paid engagement under current owner boundary. | Zero-cost eligible independent route / human acceptance | EXTERNAL HUMAN REQUIRED | #1692 / #1032 | Security / Owner |
| ENT-026 | Legal / Privacy / EU AI Act | P0 | Qualified legal reviews remain 0/8 accepted and master legal decision is not accepted. | Identifiable qualified reviewer acceptance across the required workstreams and final approved publication/contract positions. Repository drafts and provider public materials alone do not count. | Founder/operator facts; qualified counsel | EXTERNAL HUMAN REQUIRED | #1410 / #1032 | Legal / Owner |
| ENT-027 | Procurement / Customer acceptance | P1 | Internal procurement pack is prepared, but no genuine customer/counterparty acceptance is established. | Evidence-backed pack bound to the serving release plus genuine counterparty acceptance; no fabricated questionnaire/customer sign-off. | #1814; legal/security/provider residuals as required by customer | EXTERNAL COUNTERPARTY REQUIRED | #1032 | Sales / Owner |
| ENT-021 | Data / Release / Security | P0 historical | Production migration lineage had advanced beyond the prior V18 bounded package. | Reissue the 25 reviewed effects under forward-only V19 identities while preserving bytes/provenance and without migration-history repair. | Historical #1631 coordination | **REPOSITORY FIX MERGED** | #1768 | Engineering / Security / SRE |
| ENT-021A | Runtime compatibility | P0 historical | Application maintenance/email paths were ahead of the governed Production schema. | Bounded pre-V19 compatibility that defers only expected missing-schema states while unexpected failures remain fail-closed; no Production DDL required for compatibility closure. | Historical Production schema state | **CLOSED** | #1778 via merged #1780 | Engineering / Security |

## Priority order

1. **#1814 Production serving recovery** — nothing downstream may claim current runtime health while canonical health is 402.
2. Rebind exact serving SHA and protected Production/runtime evidence after service recovery.
3. Continue #1631 only under its protected Production-write authority; do not revive #1768 as an active branch/work package.
4. Close genuine external acceptance: Billing lifecycle, independent security assurance, qualified legal review and procurement counterparty acceptance.

## Safety boundary

No backlog item authorizes:

- automatic PR merge or fabricated approval;
- new company/account creation;
- paid Vercel/legal/pentest remediation under the current no-spend boundary;
- direct Supabase Production SQL/DDL, migration repair or unrestricted `db push`;
- synthetic Stripe customer/payment evidence;
- stale exact-SHA evidence carry-forward;
- `ENTERPRISE_100: PASS` or `PRODUCTION_GO: PASS` before canonical acceptance.

The historical **45%** score remains stale and is not increased by backlog status, repository merges, green CI or deployment `READY` metadata.
