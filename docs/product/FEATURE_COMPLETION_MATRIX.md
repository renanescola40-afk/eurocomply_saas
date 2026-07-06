# Feature Completion Matrix

Status legend:

- Complete: implemented with persistence and real user action.
- Partial: usable foundation exists, but one or more required UI, schema or reporting pieces still need follow-up.
- Not claimed: do not market as available.

## Current completion estimate

**92% complete / 8% remaining** for the core workflow acceptance path.

This estimate is intentionally product-focused, not cosmetic. It measures whether a real company can create an organization, register an AI system, see risk/readiness, receive tasks/documents context, and inspect audit-backed activity without relying on mock-only screens.

## Core workflow matrix

| Area | Status | What works now | Remaining work |
| --- | --- | --- | --- |
| Organization onboarding | Partial | Current organization lookup and onboarding routing exist; dashboard requires an organization. | Keep testing post-auth routing and organization creation against live Supabase. |
| AI Inventory create | Complete | User can create AI systems through the inventory UI and API with owner, category, market, processed data, vendor/model, use case, lifecycle status and risk signals. | Apply Supabase migrations in production. |
| AI Inventory detail | Complete | Detail route shows status, owner, category, country/market, processed data, vendor/model, classification, obligations, next actions and history. | Add richer actor display once user profile lookup is available. |
| AI Inventory edit/reassessment | Complete | Detail page now has a real edit/reassessment form using `PATCH /api/ai-systems/:id`; the backend validates permission, recalculates classification, updates the record, writes history and audit metadata. | Add automated UI/API tests. |
| Risk classification | Complete | Classifier returns practical risk levels, explanation, obligations and next actions. Create/reassessment flows persist the result. | Add more jurisdiction-specific prompts and review questions over time. |
| Readiness score | Partial | Readiness card and dashboard use organization data, inventory signals and governance gaps. | Continue linking score to more document/task/vendor evidence as schema expands. |
| Documents | Partial | Organization document pages and approval/download actions exist in the codebase. Dashboard tracks missing/expiring documents. | Ensure every download/export button maps to a real artifact and align statuses to draft/review/approved/expired. |
| Tasks | Partial | Compliance task create/delete/update actions are persisted, protected by role checks and audited; dashboard consumes open tasks. | Add explicit entity relationship fields where missing. |
| Vendors | Partial | Vendor create/update/delete actions, vendor queries and CSV reporting exist; dashboard highlights vendors requiring review. | Add model linkage and due diligence checklist completion flow if not already present in active routes. |
| Reports | Partial | CSV report routes exist for some areas and dashboard produces organization readiness summary. | Do not show PDF exports until a real PDF renderer/report pipeline exists. |
| Audit Timeline | Partial | Audit events are persisted through `audit_events`, legacy `audit_logs` fallback exists, and `listAuditEvents(organizationId)` provides organization-scoped timeline data with sanitized metadata. | Add the dedicated UI route using the existing query. |
| RBAC | Partial | API/server actions use organization permission checks for sensitive mutations. | Continue standardizing permissions across every dashboard route and export endpoint. |
| i18n | Partial | AI inventory UI includes Portuguese and English copy with fallback; existing app has broader locale routing. | Add translations for newly added AI inventory strings in all supported locales. |

## Acceptance check

| Acceptance criterion | Current state |
| --- | --- |
| Company can enter the app | Supported by existing auth/onboarding routing, subject to live environment configuration. |
| Company can create organization | Existing onboarding flow covers organization activation; needs live smoke validation. |
| Company can register AI system | Complete with persisted organization-scoped AI inventory create flow. |
| Company can view risk | Complete through persisted classifier output and inventory/detail UI. |
| Company can re-evaluate AI system facts | Complete through the detail page edit/reassessment workflow. |
| Company receives documents/tasks | Partial; task and document foundations exist, but generated document/task automation should be verified end-to-end from onboarding. |
| Company understands readiness | Partial/usable; readiness score, gaps and next actions are shown from organization data. |
| Important activity is auditable | Partial/usable; AI inventory create/reassessment and task actions write audit events, AI system history is persisted, and organization-scoped audit query support exists. |

## Product safety notes

- The product must not claim guaranteed legal compliance.
- High-risk and prohibited-practice outputs are framed as review requirements, not legal determinations.
- Sensitive data should be summarized in audit metadata, not copied in full.
- Any export button must be removed or disabled unless it maps to a real route and artifact.

## Follow-up backlog

1. Add dedicated organization audit timeline UI route using `listAuditEvents(organizationId)`.
2. Add automated tests for AI inventory create/detail/reassessment and route-level permission denial.
3. Connect AI system records to vendors, documents, risks and tasks via explicit relationship fields.
4. Expand new AI inventory labels to every supported locale.
5. Live smoke test onboarding → organization → AI inventory → risk → readiness after migrations are applied.
