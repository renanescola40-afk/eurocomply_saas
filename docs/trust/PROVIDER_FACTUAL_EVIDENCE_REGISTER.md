# Provider factual evidence register

**Status:** `FACTUAL_EVIDENCE_IN_REVIEW`  
**Evidence snapshot:** 2026-08-23  
**Latest runtime evidence subject captured:** `9c0801d46090f63b05fc0b7d8087e0e9313a525b`  
**Canonical tracker:** GitHub issue `#1727`  
**Current connector-observation ledger:** `docs/trust/evidence/2026-08-23-provider-account-and-runtime-reconciliation.md`

This register separates attributable provider/configuration facts from legal interpretation. It is not a DPA, legal opinion, GDPR-compliance statement, certification, independent pentest, regulator approval, or permission to accept contractual terms or incur provider spend.

## Evidence rules

A provider row may be promoted from attributable runtime/account evidence only. Repository configuration alone does not prove that a service is enabled in Production. Provider-standard legal material may establish standard agreement mechanics, but account plan, jurisdiction, acceptance or configuration must still be evidenced where those facts determine applicability.

A provider can be technically active while account/legal facts remain open. Conversely, an account connected for assurance is not Production evidence unless it is attributable to the Production integration.

The **runtime evidence subject SHA** identifies the deployed application state actually observed. Dated historical ledgers remain immutable provenance; later reconciliations supersede stale current-state claims without rewriting the historical record.

Do not retain API keys, tokens, passwords, connection strings, webhook secrets, payment instruments, bank details, private contracts, personal identity details or exact public analytics project tokens when unnecessary to prove state.

## Factual reconciliation

| Provider / service | Production/configuration fact supported by captured evidence | Region / location fact | Provider/legal material boundary | Current evidence state | Still required before contractual disclosure |
| --- | --- | --- | --- | --- | --- |
| Vercel | Current-main Production was observed `READY` on runtime subject `9c0801d46090f63b05fc0b7d8087e0e9313a525b`; the connected team plan is `pro`. No `error`/`fatal` logs or HTTP `5xx` responses were observed for the exact deployment in the inspected post-deploy window. | Runtime delivery region alone is not a final legal transfer conclusion. | Vercel's standard DPA processor regime covers Pro/Enterprise customers; final entity, retention and transfer treatment remains qualified-review work. | `RUNTIME_EVIDENCE_CAPTURED / PRO_PLAN_PROVEN / LEGAL_FACTS_INCOMPLETE` | Contracting entity, retention/deletion, transfer treatment and final legal sufficiency. |
| Supabase | Production is `ACTIVE_HEALTHY` in the connected `pro` organization. Direct Privacy Team evidence confirms DPA incorporation into Terms from 2026-08-01. Security Advisor no longer reports the prior leaked-password warning. | Project region is `eu-west-1` (Ireland). | Pro includes standard daily-backup entitlement, but the strict resilience authority still requires managed-backup observation and Management API HIBP truth. PITR is separately enabled/paid and is not proven active. | `PROJECT_REGION_PROVEN / PRO_PLAN_PROVEN / DPA_APPLICABILITY_PROVEN / STRICT_RESILIENCE_PROOF_OPEN` | Exact managed-backup observation, strict HIBP auth-config proof, PITR status if required, retention/RPO/RTO commitments and legal sufficiency. |
| Stripe | Connected LIVE Standard account is configured for `PT`, business type `individual`, with charges and payouts enabled and no currently due account requirements. LIVE inventory contains zero PaymentIntents, zero subscriptions and zero Checkout Sessions. | Account country `PT` is proven; no claim is made here about where every Stripe data category is stored. | PT account evidence makes the standard European Stripe contracting/DPA path attributable. Final legal interpretation remains qualified-review work. | `LIVE_ACCOUNT_FACTS_PROVEN / EU_STANDARD_CONTRACT_DPA_PATH_ATTRIBUTABLE / CUSTOMER_LIFECYCLE_OPEN` | Genuine customer LIVE lifecycle, enabled-service data categories, retention/deletion, transfer/subprocessor treatment and final legal approval. |
| GitHub | Repository `renanescola40-afk/eurocomply_saas` and CI/workflows are actively used. The repository is public and owned by a personal GitHub account. | No customer-data processing region specific to this account is established here. | Public GitHub legal material must not be projected into a Team/Enterprise contract that is not proven. | `REPOSITORY_USAGE_PROVEN / PUBLIC_REPO_PROVEN / PERSONAL_ACCOUNT_PROVEN / CONTRACT_APPLICABILITY_OPEN` | Determine relevant data categories and retention; confirm applicable account terms/DPA if required for the operating model. |
| Sentry | Current Production bundle is bound to the current release; privacy guardrails disable default PII, remove request/user objects before send and keep replay sampling disabled. | Configured ingestion endpoint is in the German/European region. | Sentry support states DPA acceptance must be checked/accepted inside the organization by an authorized role; this reconciliation did not accept it. | `RUNTIME_EVIDENCE_CAPTURED / PRIVACY_GUARDRAILS_PROVEN / EU_DE_REGION_PROVEN / ACCOUNT_LEGAL_FACTS_INCOMPLETE` | Account DPA acceptance, retention, transfer/subprocessor terms, contracting entity and final legal sufficiency. |
| PostHog | Production targets EU API/assets endpoints and contains a populated public project token. The only connected assurance project is a different empty `Default project`; the two project tokens do not match. Exact values are omitted. | Production technical endpoint region is EU; the actual Production account/project remains unattributed. | The connected no-ingestion project must not be used as Production account evidence. | `PRODUCTION_BINDING_PRESENT / CONNECTED_ASSURANCE_PROJECT_MISMATCH / ACCOUNT_FACTS_OPEN` | Recover/connect the actual Production project/account; confirm owner, plan, region settings, retention, DPA/account applicability, transfer/subprocessor terms and consent/cookie treatment. |
| Resend / transactional email | Provider-standard material documents DPA incorporation, US primary storage, transfer mechanisms and deletion/backup boundaries. The protected exact-main Production Provider Runtime Proof artifact was not directly observed in this reconciliation. | Provider-standard primary storage is US; exact account configuration remains separate. | Standard contractual mechanics are captured, but they do not independently prove current exact-release binding, sender-domain verification or delivery availability. | `PROVIDER_STANDARD_CONTRACT_FACTS_CAPTURED / CURRENT_EXACT_PROVIDER_PROOF_OPEN` | Protected exact-main binding proof, sender-domain verification, delivery availability, account plan/entity and final legal treatment. |
| Upstash / Redis | Distributed high-risk rate limiting was previously proven by attributable Production behavior. | Exact account region configuration is not established by retained account-specific evidence. | Provider-standard material documents DPA incorporation and standard transfer/deletion mechanics, while exact account facts remain open. | `RUNTIME_BINDING_PROVEN / ACCOUNT_LEGAL_FACTS_OPEN` | Exact account/plan, owner, regions, retention/deletion specifics and final qualified legal role. |
| Malware/content scanning provider | Runtime policy and #1790 contracts require provider-backed scanning when enterprise upload scanning is enabled; this reconciliation did not directly observe the exact-main protected provider-proof artifact. | `UNKNOWN_CURRENT` | No current account-specific provider contract evidence retained. | `CONDITIONAL_UNVERIFIED` | Exact active provider/binding, scope, data categories, region, retention, DPA/transfer terms. |
| OpenAI / ChatGPT — founder operational use outside SaaS runtime | Owner declaration identifies external AI use outside direct SaaS runtime. Current evidence does not establish a direct model-provider integration in Production. | Current RISCK COMPLY-specific location for that operational workspace is not established here. | Business/Enterprise/API commitments must not be projected onto an unproven personal-workspace arrangement. | `FOUNDER_FACT_CAPTURED / DIRECT_RUNTIME_INTEGRATION_NOT_IDENTIFIED / LEGAL_FACTS_INCOMPLETE` | Exact workspace terms, retention/deletion/training posture and qualified decision on whether customer content may enter that workflow. |

## Current Production compatibility observations

- Current-main Production is `READY` and release-attributable to `9c0801d46090f63b05fc0b7d8087e0e9313a525b`.
- The exact deployment had no observed `error`/`fatal` logs or HTTP `5xx` responses in the inspected post-deploy window.
- The Production `compliance_metric_snapshots` table exists but is missing five columns required by the V19 readiness contract: `open_tasks`, `open_risks`, `critical_risks`, `high_risk_vendors`, and `missing_documents`.
- No Production DDL was executed. Metric snapshot writes remain intentionally disabled/fail-closed until schema compatibility is proven.

## Stale evidence explicitly rejected as current provider proof

The 2026-08-22 ledger remains valid historical provenance, but its observations that Vercel was Hobby, Supabase was Free, Stripe account country was unresolved and Sentry region was unresolved are superseded by the dated 2026-08-23 account/runtime reconciliation. Historical snapshots must not be used to override newer attributable current-state evidence.

## Legal interpretation boundary

The following remain `QUALIFIED_HUMAN_REQUIRED` where applicable:

- controller/processor/subprocessor role allocation;
- Article 28 and international-transfer legal sufficiency;
- subprocessor authorisation, notice and objection model;
- analytics/cookie/consent legal requirements;
- retention/legal-hold decisions;
- final Privacy Policy, Terms, DPA and customer-contract language;
- Sentry DPA acceptance where an authorized account role must act;
- whether a technically active provider is legally a processor, subprocessor, independent controller or another role for a particular data flow.

Provider-standard terms can support factual due diligence, but they do not substitute for qualified legal approval of RISCK COMPLY's final disclosure and contracting position.

## Exact-SHA / release treatment

There are two distinct SHAs:

1. **runtime evidence subject SHA** — the deployed state actually observed and attributable to runtime evidence;
2. **document-containing commit SHA** — the repository commit that stores this register.

They are not required to be identical. A documentation-only commit or merge can change the second SHA without changing provider/account facts. A claim about the **latest live release** still requires Production deployment revalidation.

## Closure state

`PROVIDER_FACTUAL_RECONCILIATION: UPDATED_2026_08_23`

`VERCEL_PLAN: PROVEN_PRO`

`SUPABASE_PLAN: PROVEN_PRO`

`SUPABASE_DPA_APPLICABILITY: PROVEN`

`STRIPE_ACCOUNT_COUNTRY: PROVEN_PT`

`SENTRY_PRODUCTION_REGION: PROVEN_EU_DE`

`UPSTASH_RUNTIME_BINDING: PROVEN`

`POSTHOG_CONNECTED_ASSURANCE_PROJECT: NOT_PRODUCTION`

`CONNECTED_ASSURANCE_PROJECT_MISMATCH`

`ACCOUNT_FACTS_OPEN`

`ACCOUNT_LEGAL_FACTS_OPEN`

`PRIVACY_GDPR_LEGAL_INTERPRETATION: WAITING_QUALIFIED_HUMAN`

`SUBPROCESSOR_DPA_REGISTER: NO_PASS_YET`
