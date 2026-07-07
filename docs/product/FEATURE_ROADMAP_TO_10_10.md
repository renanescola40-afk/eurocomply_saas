# Feature Roadmap To 10/10

This roadmap keeps the product honest: no fake integrations, no unsupported compliance claims and no enterprise language without operational evidence.

## Completed in the first high-impact package

- Evidence Pack Builder foundation with Supabase persistence through `enterprise_evidence_packs` and `enterprise_evidence_pack_items`.
- Executive readiness signals on the AI system enterprise view, using real system facts, obligations and next actions.
- AI System Detail Enterprise View with evidence, vendor, risk and audit context.
- Vendor Due Diligence Checklist workflow with reviewer, status, risk level and checklist persistence.
- Risk Review Workflow with AI system link, reviewer/requester, due date and review status.
- Organization audit support via existing audit event infrastructure for sensitive workflow creation.
- Next-best-action logic remains visible in the dashboard command center and now routes users into real AI system workflows instead of placeholder pages.

## P0: Operational readiness and evidence

1. Evidence pack review lifecycle
   - Add item-level approval and reviewer assignment.
   - Add evidence completeness score per pack.
   - Add export event tracking before PDF/CSV export.

2. Executive readiness report
   - Move report generation into a dedicated route after source-file creation is available.
   - Include inventory coverage, evidence coverage, vendor diligence coverage, risk review coverage and audit trail freshness.
   - Add PDF export only when it uses real data and records an audit event.

3. AI system registry enterprise fields
   - Add owner, business process, department, data category, data retention, affected users, model/provider version and deployment region.
   - Add linked evidence, linked vendor review and linked risk review sections.

4. Vendor and model review
   - Add model/provider review separate from legal vendor review.
   - Track hosting region, data reuse, retention, training-on-customer-data flag and subprocessor review.

5. Approval workflow
   - Add status transitions: draft -> in review -> approved / remediation required.
   - Record actor, role, timestamp and decision summary in audit events.

## P1: Enterprise buyer readiness

1. Procurement packet
   - Combine executive report, evidence pack, security page, subprocessors, DPA links and AI governance summary.
   - Do not claim certifications unless evidence exists.

2. Multi-country readiness
   - Compute readiness by market/country from AI systems and evidence packs.
   - Add country-specific obligations as guidance, not legal advice.

3. Deadlines and reminders
   - Consolidate review due dates across tasks, vendor diligence, risk reviews and document expiry.
   - Send reminders only after email preferences and backend jobs exist.

4. Export PDF/CSV
   - Add role-aware export with `export_data` permission.
   - Add no-store headers and audit event for every export.

5. Admin controls
   - Add workflow policy settings: required approver roles, review SLA and pack export restrictions.

## P2: Integrations roadmap

These should stay as roadmap items until backend connectors exist:

- Slack / Teams notifications.
- Jira / Linear task sync.
- Google Drive / SharePoint evidence import.
- Vendor security questionnaire import.
- GRC platform export.

## Acceptance bar

A feature is considered enterprise-ready only when it has real UI, backend persistence, tenant scoping, RBAC, secure empty/error/loading/success states, i18n, tests and audit logging for sensitive actions.
