# Enterprise Feature Gap Analysis

This document compares the current product surface with the operational standard expected from serious AI governance and compliance platforms.

## Current strengths

- AI inventory exists and stores real AI system records with organization scoping.
- Risk classification exists through the AI governance classifier and persists risk level, obligations and next actions.
- Dashboard command center already shows real workspace signals instead of fake metrics.
- RBAC and audit helpers exist and should be reused for sensitive workflows.
- Supabase RLS coverage exists for the core tenant model.

## High-impact gaps

| Area | Current state | Enterprise gap | Priority |
| --- | --- | --- | --- |
| AI system registry advanced | Basic registry and detail view exist. | Needs system-level evidence, vendor diligence, risk review and approval state in one detail view. | P0 |
| Evidence pack builder | Documents and dashboard signals exist. | Needs pack records, pack items, ownership, status and export-ready structure. | P0 |
| Policy generator | Document generator routes exist. | Needs policy status tied to evidence packs and review workflow. | P1 |
| Vendor due diligence | Vendor dashboard signals exist. | Needs checklist, reviewer, risk level, next review date and link to AI systems. | P0 |
| Model/vendor review | AI system fields include vendor and model names. | Needs structured model/provider review and procurement evidence. | P0 |
| Approval workflows | Some document approval exists. | Needs risk review lifecycle with reviewer, due date, decision and audit event. | P0 |
| Executive reports | Dashboard is strong. | Needs board-ready report object with coverage, posture, countries and next actions. | P0 |
| Audit timeline | Audit events exist. | Needs organization timeline exposed in product UI. | P0 |
| Multi-country readiness | Country fields exist on AI systems. | Needs per-country readiness summary. | P0 |
| Deadlines/reminders | Tasks and dates exist. | Needs consolidated evidence/vendor/risk due dates. | P1 |
| Export PDF/CSV | Some export controls exist. | Needs export from evidence pack/report with role-aware controls. | P1 |
| Procurement packet | Trust center and docs exist. | Needs packet builder combining report, evidence, vendor review and policies. | P1 |
| Integrations roadmap | No live integration promise should be made. | Needs honest roadmap only, not fake buttons. | P2 |
| Admin controls | Team/roles exist. | Needs admin workflow policy settings and approval routing. | P1 |
| Enterprise support workflows | Support readiness docs exist. | Needs in-app enterprise support workflow only when backend exists. | P2 |

## P0 implementation target

The first release package should focus on operational readiness evidence: evidence packs, executive readiness report, AI system enterprise detail view, vendor due diligence checklist, risk review workflow, audit timeline and next-best-actions.

## Product principle

Do not claim compliance. The product should help teams prepare, organize and review evidence for AI Act readiness with legal and compliance owners.
