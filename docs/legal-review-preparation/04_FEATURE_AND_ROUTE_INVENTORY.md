# Feature and Route Inventory

Status: `AI_PRE_REVIEW_COMPLETE` with repository-path verification required by CI.

| Workstream | Principal implementation or route | Evidence boundary |
|---|---|---|
| Legal rules | `src/server/ai-governance/legal-rules.ts`, decision engine, legal-rules validation APIs | Source currency and interpretation require counsel confirmation |
| Scope/classification | `src/server/ai-governance/decision-engine.ts`, `/api/ai-systems` | Suggested classification is not a final legal decision |
| Prohibited practices | `/api/ai-governance/prohibited-practices`, prohibited-practice queries | Exceptions and disputed facts require qualified review |
| AI literacy | `/api/ai-literacy`, localized AI-literacy dashboard | Records activity; does not prove legal sufficiency |
| Article 50 | localized transparency dashboard | Copy, role allocation, timing and exceptions require review |
| Readiness scoring | regulatory control tower and API | Operational score is not compliance certification |
| FRIA | `/api/ai-governance/fria`, localized FRIA dashboard | Applicability, rights impact and residual risk require human decision |
| Deployer obligations | deployer-obligations engine/workspace | Role and context-specific legal duties require review |
| High-risk provider | high-risk provider data-governance engine/workspace | Does not establish high-risk status or dataset adequacy |
| Annex IV | technical-documentation engine/workspace | Generated structure must be completed for the real system |
| QMS | quality-management-system engine/workspace | Organises evidence; does not prove operational effectiveness |
| Conformity | conformity-assessment engine/workspace | No automatic CE marking, declaration or notified-body approval |
| Post-market | `/api/ai-incidents` and incident routes | Customer execution and reporting obligations remain contextual |
| GPAI | GPAI compliance engine/workspace | Must distinguish model provider, integrator and user obligations |
| Vendor assurance | localized vendors dashboard | Provider representations require independent verification |
| Platform controls | platform dashboard, enterprise licensing, approvals, reports and security gates | Technical controls are not legal acceptance |

## Shared product surfaces

- localized public landing, pricing, trust, security, compliance and legal pages;
- login, signup, OAuth callback and onboarding;
- organisation dashboard and membership administration;
- inventory, assessments, documents, tasks, vendors, reports and audit logs;
- billing checkout, customer/subscription and webhook operations;
- health, readiness, observability and release-validation routes;
- reviewer/control-centre and evidence-package support where implemented.

## Route verification rule

This document is an orientation index, not runtime evidence. The truth audit and route-contract tests must confirm that each referenced route/file exists on the exact reviewed SHA. Missing, renamed, disabled or roadmap-only items must be reclassified before counsel handoff.
