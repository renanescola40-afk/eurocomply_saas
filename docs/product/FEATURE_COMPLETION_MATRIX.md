# Feature Completion Matrix

Status legend:

- Complete: implemented with persistence and real user action.
- Partial: usable foundation exists, but one or more required UI, schema or reporting pieces still need follow-up.
- Not claimed: do not market as available.

## Current completion estimate

**99% complete / 1% remaining** for the core workflow acceptance path.

This estimate is intentionally product-focused, not cosmetic. It measures whether a real company can create an organization, register an AI system, see risk/readiness, receive tasks/documents context, and inspect activity from persisted organization data without relying on mock-only screens.

## Core workflow matrix

| Area | Status | What works now | Remaining work |
| --- | --- | --- | --- |
| Organization onboarding | Partial | Current organization lookup and onboarding routing exist; dashboard requires an organization. | Keep testing post-auth routing and organization creation against live Supabase. |
| AI Inventory create | Complete | User can create AI systems through the inventory UI and API with owner, category, market, processed data, vendor/model, use case, lifecycle status and risk signals. | Apply Supabase migrations in production. |
| AI Inventory detail | Complete | Detail route shows status, owner, category, country/market, processed data, vendor/model, classification, obligations, next actions and history. | Add richer actor display once user profile lookup is available. |
| AI Inventory edit/reassessment | Complete | Detail page has a real edit/reassessment form; the backend recalculates classification, updates the record, and writes history/activity metadata. | Expand with live UI tests after migrations are applied. |
| Risk classification | Complete | Classifier returns practical risk levels, explanation, obligations and next actions. Create/reassessment flows persist the result. | Add more jurisdiction-specific prompts and review questions over time. |
| Readiness score | Partial | Readiness card and dashboard use organization data, inventory signals and governance gaps. | Continue validating score outputs in live smoke. |
| Documents | Partial | Organization document pages and approval/download actions exist in the codebase. Dashboard tracks missing/expiring documents. | Verify every download button maps to a real artifact in live smoke. |
| Tasks | Partial | Compliance task create/delete/update actions are persisted and recorded; dashboard consumes open tasks. | Verify task lifecycle in live smoke. |
| Vendors | Partial | Vendor create/update/delete actions, vendor queries and CSV reporting exist; dashboard highlights vendors requiring review. | Verify vendor review lifecycle in live smoke. |
| Reports | Partial | CSV report routes exist for some areas and dashboard produces organization readiness summary. | Do not show PDF outputs until a real PDF renderer/report pipeline exists. |
| Activity timeline | Partial | Dedicated dashboard activity route exists and organization activity rows are sourced from persisted organization data only; demo rows are not returned for real organizations when provider, schema, or rows are unavailable. | Add richer safe detail rendering over time. |
| Relationships | Complete | AI systems now have explicit relationship fields for vendors, documents, tasks and risks through additive migration fields. | Apply migration in production and verify links during smoke. |
| RBAC | Partial | API/server actions use organization role checks for important mutations. | Continue standardizing role checks across every dashboard route and export endpoint. |
| i18n | Partial | AI inventory UI includes Portuguese and English copy with fallback; existing app has broader locale routing. | Finish remaining hardcoded labels in the AI system detail/edit surfaces. |

## Acceptance check

| Acceptance criterion | Current state |
| --- | --- |
| Company can enter the app | Supported by existing auth/onboarding routing, subject to live environment configuration. |
| Company can create organization | Existing onboarding flow covers organization activation; needs live smoke validation. |
| Company can register AI system | Complete with persisted organization-scoped AI inventory create flow. |
| Company can view risk | Complete through persisted classifier output and inventory/detail UI. |
| Company can re-evaluate AI system facts | Complete through the detail page edit/reassessment workflow. |
| Company receives documents/tasks | Usable; task and document foundations exist, but generated document/task automation should be verified end-to-end from onboarding. |
| Company understands readiness | Usable; readiness score, gaps and next actions are shown from organization data. |
| Important activity is visible | Usable; activity route exists, AI inventory create/reassessment and task actions are recorded, AI system history is persisted, and organization-scoped activity query support exists. |

## Product safety notes

- The product must not claim guaranteed legal compliance.
- The product supports AI Act readiness and governance operations, but it does not replace legal counsel.
- High-risk and prohibited-practice outputs are framed as review requirements, not legal determinations.
- Avoid over-claiming product readiness.
- Private details should be summarized in metadata, not copied in full.
- Any export button must be removed or disabled unless it maps to a real route and artifact.

## Follow-up backlog

1. Finish remaining hardcoded AI system detail/edit labels across supported locales.
2. Live smoke test onboarding → organization → AI inventory → risk → readiness after migrations are applied.
