# RISCK COMPLY — GDPR Data Role Matrix

Date: 2026-09-09  
Baseline: Regulation (EU) 2016/679

Purpose: map processing activity by activity. One controller/processor label must not be assumed to apply to the whole service.

## Role principles

Under GDPR, the role depends on who determines the purposes and means of a particular processing activity. This matrix records the current product/contract position and keeps materially interpretive allocations pending qualified review.

## Processing-role matrix

| Processing activity | Data examples | Customer role | RISCK COMPLY candidate role | Current evidence | State |
|---|---|---|---|---|---|
| Customer workspace content | AI inventories, vendor records, risks, evidence, documents, tasks and customer-entered personal data | Controller or processor depending on customer's own role | Processor or subprocessor on documented customer instructions | DPA review draft §§1–3; product tenant/workspace model | PENDING_EXTERNAL_REVIEW |
| Customer workspace user administration | membership, roles, permissions | Controller for workforce/user administration | Processor for customer-directed workspace administration; possible independent security obligations remain separate | DPA review draft; RBAC/tenant implementation evidence | PENDING_EXTERNAL_REVIEW |
| Account registration and identity administration | user name/email, authentication metadata, session/account state | Data subject/employer may also have a role | Likely controller for service-account administration to the extent RISCK COMPLY determines service account purposes/means | Privacy review draft §§1–4 | PENDING_EXTERNAL_REVIEW |
| Security, abuse prevention and platform integrity | access events, denial logs, IP/device/log metadata, incident records | May be controller for its own security records | Likely controller for provider security/legal obligations where purposes are independently determined | Privacy review draft §§3–4, §9; security evidence | PENDING_EXTERNAL_REVIEW |
| Billing and subscription administration | Stripe customer/subscription/payment metadata | Customer/payor | Likely controller for own billing, accounting and contract administration; Stripe role must be assessed separately | Privacy review draft; Stripe implementation | PENDING_EXTERNAL_REVIEW |
| Customer support | tickets, communications, diagnostic data | Controller for customer content supplied in support | Mixed: processor for customer content handled on instruction; controller for own support administration may apply | Privacy review draft §§2–4 | PENDING_EXTERNAL_REVIEW |
| Optional product analytics | usage events, product interaction metadata | N/A or contextual | Controller if RISCK COMPLY determines analytics purposes; applicability depends on actual enabled configuration and consent/legal basis | Trust Center lists PostHog as optional | BLOCKED_PRODUCTION_CONFIGURATION |
| Marketing/commercial communications | prospect/contact data, requests, campaign metadata where used | N/A | Controller where RISCK COMPLY determines marketing/commercial purposes | Privacy review draft scope | PENDING_EXTERNAL_REVIEW |
| Regulatory/security record retention | legal holds, tax/billing records, security evidence | Contextual | Controller where retained for provider legal obligations or legal claims; processor where retained solely on customer instruction | Retention decisions and enforcement not final | BLOCKED_RETENTION_AND_LEGAL_BASIS |

## Required closure work

1. Confirm actual Production data flows and enabled providers.
2. Confirm whether optional analytics is enabled and under what configuration.
3. Complete legal-basis mapping for controller-side activities.
4. Confirm processor/subprocessor allocation for customer-controlled workspace data in the final DPA.
5. Resolve retention purpose/basis separately for controller records and processor records.
6. Obtain qualified privacy review for mixed-role and borderline activities.

## Terminal state

```text
CUSTOMER_WORKSPACE_PROCESSOR_MODEL=DOCUMENTED_PENDING_EXTERNAL_REVIEW
INDEPENDENT_CONTROLLER_ACTIVITIES=MAPPED_PENDING_EXTERNAL_REVIEW
OPTIONAL_ANALYTICS_ROLE=BLOCKED_PRODUCTION_CONFIGURATION
DATA_ROLE_MATRIX=PENDING_EXTERNAL_REVIEW
```
