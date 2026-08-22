# Provider factual evidence register

**Status:** `FACTUAL_EVIDENCE_IN_REVIEW`  
**Evidence snapshot:** 2026-08-22  
**Latest runtime evidence subject captured:** `3a3382e385eb54f8e706e31046c8b7d497057527`  
**Canonical tracker:** GitHub issue `#1727`  
**Current connector-observation ledger:** `docs/trust/evidence/2026-08-22-external-assurance-runtime-provider-revalidation.md`

This register separates attributable provider/configuration facts from legal interpretation. It is not a DPA, legal opinion, GDPR-compliance statement, certification, independent pentest, regulator approval, or proof that every public provider term is contractually applicable to the RISCK COMPLY account.

## Evidence rules

A provider row may be promoted from attributable runtime/account evidence only. Repository configuration alone does not prove that a service is enabled in Production. A public DPA alone does not prove that the RISCK COMPLY account accepted or is covered by it.

A provider can be technically active while account/legal facts remain open. Conversely, an account connected for assurance is not Production evidence unless it is attributable to the Production integration.

The **runtime evidence subject SHA** identifies the deployed application state actually observed. The Git commit that later contains this register may differ because committing or merging documentation creates a new repository commit. That difference alone does not invalidate previously observed provider/account facts. Release-bound facts must be revalidated when provider configuration, data flow, runtime behavior, deployment state, region, retention or service scope changes materially, or whenever this register makes a new claim about the latest live release.

Do not retain API keys, tokens, passwords, connection strings, webhook secrets, private contracts, or exact public client project tokens when their value is unnecessary to prove state.

## Factual reconciliation

| Provider / service | Production/configuration fact supported by captured evidence | Region / location fact | Provider/legal material boundary | Current evidence state | Still required before contractual disclosure |
| --- | --- | --- | --- | --- | --- |
| Vercel | On 2026-08-22, target-production deployment `dpl_HNt5846gxC36eaEZbynqJTu69GFN` was observed as `READY`, bound to runtime subject `3a3382e385eb54f8e706e31046c8b7d497057527`; `/pt/trust` returned HTTP `200`. The connected team plan remains `hobby`. | Runtime delivery includes Vercel infrastructure; no RISCK COMPLY-specific legal processing/transfer region is established by deployment metadata alone. | Public Vercel DPA/terms are provider material only. The current Hobby account/plan mismatch with commercial B2B operation remains a separate owner/provider-contract blocker. | `RUNTIME_EVIDENCE_CAPTURED / HOBBY_PLAN_MISMATCH_OPEN / LEGAL_FACTS_INCOMPLETE` | Move Production to an applicable commercial plan/agreement when owner authorizes spend; retain account-specific contract/DPA evidence; confirm contracting entity, retention/deletion and transfer treatment. |
| Supabase | Connected Production project `tganhbbhfxcpblmgqprg` remains active; the connected organization remains on plan `free`. Provider-confirmed DPA mechanics exist separately. | Project region is `eu-west-1` (Ireland). | Supabase provider-confirmed DPA incorporation, SCC/UK mechanisms where applicable and notice mechanics are factual provider evidence; qualified legal sufficiency and plan-specific resilience remain separate. | `PROJECT_REGION_PROVEN / DPA_FRAMEWORK_PROVEN / FREE_PLAN_RESILIENCE_OPEN / LEGAL_REVIEW_OPEN` | Qualified legal treatment; customer-accessible restore/recovery evidence; applicable backup/PITR/RPO/RTO commitments; any required paid capability. |
| Stripe | Connected LIVE account identity is `RISCK COMPLY SAAS`; canonical LIVE Products/Prices and enabled LIVE webhook evidence exist. A genuine current customer subscription/checkout lifecycle has not been proven. | Connector evidence retained here does not expose account country or establish a processing/storage region. | Stripe public DPA/Services Agreement framework does not determine the applicable RISCK COMPLY contracting entity without account-country evidence. | `LIVE_CONTROL_PLANE_PROVEN / CUSTOMER_LIFECYCLE_OPEN / APPLICABLE_DPA_ENTITY_OPEN` | Account country, contracting/DPA entity, account-specific applicability, enabled-service data categories, retention/deletion and transfer/subprocessor treatment; genuine LIVE customer lifecycle evidence. |
| GitHub | Repository `renanescola40-afk/eurocomply_saas` and CI/workflows are actively used. The repository is public and owned by a personal GitHub account. | No customer-data processing region specific to this account is established here. | Public GitHub legal material must not be projected into a Team/Enterprise contract that is not proven. | `REPOSITORY_USAGE_PROVEN / PUBLIC_REPO_PROVEN / PERSONAL_ACCOUNT_PROVEN / CONTRACT_APPLICABILITY_OPEN` | Determine relevant data categories and retention; confirm applicable account terms/DPA if required for the operating model. |
| Sentry | Current Production `/pt/trust` for runtime subject `3a3382e385eb54f8e706e31046c8b7d497057527` exposes `sentry-environment=production` and exact current Sentry release metadata. Current client configuration disables default PII, removes request/user objects before send and keeps replay sampling disabled. | Sentry organization data-storage region is not established by the retained account evidence. | Provider public DPA/security material and support guidance do not establish account acceptance/region for this organization. | `RUNTIME_EVIDENCE_CAPTURED / PRIVACY_GUARDRAILS_PROVEN / ACCOUNT_LEGAL_FACTS_INCOMPLETE` | Organization/project ownership, region, legal entity, account DPA acceptance/applicability, retention, transfer/subprocessor terms and legal sufficiency. |
| PostHog | The current Production client bundle contains a populated PostHog public project identifier and EU API/assets endpoints. The connected PostHog assurance account exposes only one **different** project, created on 2026-08-22, with no proven ingestion. Exact identifiers are intentionally omitted. | Production client targets EU service endpoints, but the actual Production project/account region and contractual account remain unattributed. | The newly connected no-ingestion project must not be used as Production account evidence. Public PostHog trust/DPA material is generic until the real Production project/account is identified. | `PRODUCTION_BINDING_PRESENT / CONNECTED_ASSURANCE_PROJECT_MISMATCH / ACCOUNT_FACTS_OPEN` | Identify/recover the actual Production project/account; confirm owner, plan, region, retention, DPA/account applicability, transfer/subprocessor terms, event categories and qualified consent/cookie treatment. |
| Resend / transactional email | Repository runtime supports Resend-backed delivery and historical RISCK COMPLY deliveries are attributable. No new current exact-release Production send/account binding was established in the 2026-08-22 revalidation. | Current RISCK COMPLY account/runtime region is unproven. | Resend public DPA/subprocessor material is generic provider evidence and cannot prove current account use or acceptance. | `HISTORICAL_USE_PROVEN / CURRENT_PRODUCTION_BINDING_OPEN / PROVIDER_PUBLIC_MATERIAL_AVAILABLE` | Confirm current Production binding first; if active, establish account/legal entity, applicable agreement/DPA, message data, retention, transfer/subprocessor terms and customer-notice implications. |
| Upstash / Redis | Production code uses Upstash Redis for distributed high-risk rate limiting/security-control state. On runtime subject `3a3382e385eb54f8e706e31046c8b7d497057527`, `/api/internal/metric-snapshots` returned normal HTTP `429 Too Many Requests` with rate-limit headers. The high-risk control is designed to fail closed with HTTP `503 security_control_unavailable` if Redis is missing or unavailable; the observed `429` therefore proves the distributed Redis backend was bound and responding for the request. | Exact Upstash account region(s) are not established by retained account-specific evidence. | Upstash public DPA/security/region material exists but does not prove RISCK COMPLY account plan, DPA applicability, retention or transfer treatment. | `RUNTIME_BINDING_PROVEN / ACCOUNT_LEGAL_FACTS_OPEN` | Exact account/plan, owner, primary/read region(s), retention/deletion behavior, DPA/Agreement applicability, transfer/subprocessor/change-notice treatment and qualified legal role. |
| Malware/content scanning provider | Runtime policy requires provider-backed scanning for enabled enterprise uploads; historical ClamAV/scanner validation exists, but current exact-release provider identity/binding is not established here. | `UNKNOWN_CURRENT` | No current account-specific provider contract evidence retained. | `CONDITIONAL_UNVERIFIED` | Confirm actual active provider and scope, data/content categories, region, retention, DPA/transfer terms. |
| OpenAI / ChatGPT — founder operational use outside SaaS runtime | Owner declaration identifies ChatGPT/OpenAI as an external AI service used operationally outside direct SaaS runtime. Current evidence does not establish a direct model-provider integration in the SaaS runtime. | Current RISCK COMPLY-specific processing/storage location for the personal operational workspace is not established here. | Business/Enterprise/API no-training-by-default commitments must not be projected onto an unproven personal-workspace arrangement. | `FOUNDER_FACT_CAPTURED / DIRECT_RUNTIME_INTEGRATION_NOT_IDENTIFIED / LEGAL_FACTS_INCOMPLETE` | Exact workspace terms, retention/deletion and training posture; qualified counsel decision on legal role and whether customer content may enter this workflow or must be excluded/upgraded. |

## Current release compatibility observation

PR `#1780` was merged into runtime subject `3a3382e385eb54f8e706e31046c8b7d497057527` to restore pre-V19 maintenance/email compatibility. Current Production deployment is `READY`. A scoped Vercel runtime-error query found no errors for `/api/intelligence/refresh` or `/api/internal/compliance-alerts` in the inspected post-deploy window. This is stability evidence only; it does not prove that both internal routes executed after deployment.

## Stale evidence explicitly rejected as current provider proof

Historical provider snapshots remain useful provenance for their capture dates but must not be used alone to claim current enablement, DPA status, region, retention or final-release coverage. In particular, old secret-store/runtime inventories and pre-`3a3382e...` deployment snapshots are not the current release subject.

## Legal interpretation boundary

The following remain `QUALIFIED_HUMAN_REQUIRED` where applicable:

- controller/processor/subprocessor role allocation;
- lawful-basis descriptions;
- Article 28 DPA sufficiency;
- international-transfer treatment;
- subprocessor authorisation, advance notice and objection model;
- analytics/cookie/consent legal requirements and final notice wording;
- retention/legal-hold decisions;
- final Privacy Policy, Terms and DPA language;
- whether a technically active provider is legally a processor, subprocessor, independent controller or another role for a particular data flow.

Public provider terms may support factual due diligence, but they are not a substitute for confirming the actual account agreement and obtaining qualified legal review.

## Exact-SHA / release treatment

There are two distinct SHAs:

1. **runtime evidence subject SHA** — the deployed state actually observed and attributable to runtime evidence;
2. **document-containing commit SHA** — the repository commit that stores this register.

They are not required to be identical. A documentation-only commit or merge can change the second SHA without changing the runtime/provider fact previously observed. That does not create evidence that the new commit was deployed and does not automatically invalidate the prior runtime observation.

For a statement that something is the **latest live release**, Production deployment state must be revalidated and a new runtime evidence subject recorded. Provider contract/DPA evidence has its own document/version/effective-date scope and does not become stale solely because application code changes; material changes in data flows, enabled providers, regions, retention or service scope require reconciliation.

## Closure state

`PROVIDER_FACTUAL_RECONCILIATION: IN_REVIEW`

`UPSTASH_RUNTIME_BINDING: PROVEN`

`POSTHOG_CONNECTED_ASSURANCE_PROJECT: NOT_PRODUCTION`

`PRIVACY_GDPR_LEGAL_INTERPRETATION: WAITING_QUALIFIED_HUMAN`

`SUBPROCESSOR_DPA_REGISTER: NO_PASS_YET`
