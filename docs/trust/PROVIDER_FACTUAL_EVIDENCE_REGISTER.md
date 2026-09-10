# Provider factual evidence register

**Status:** `CURRENT_CONNECTED_ACCOUNT_ADDENDUM_ACTIVE / CONTRACTUAL_FACTS_IN_REVIEW`  
**Prior runtime overlay:** `docs/trust/evidence/2026-09-09-provider-current-overlay.md`  
**Connected-account addendum captured:** `2026-09-10`  
**Protected main at connected-account capture:** `6ca43bfea63567abcf352181b7c190730d647c17`  
**Protected Provider Runtime acceptance:** `OPEN`  
**Canonical tracker:** GitHub issue `#1727`

This register separates attributable provider/configuration facts from legal interpretation. It is not a DPA, legal opinion, GDPR-compliance statement, certification, independent pentest, regulator approval, or proof that every public provider term is contractually applicable to the RISCK COMPLY account.

## Current authority model

For release-specific runtime claims, retain the exact SHA/deployment/runtime artifact that proved the fact. For connected-account/project facts, the 2026-09-10 addendum below supersedes older account/project uncertainty only for the fields actually revalidated.

Protected-main lineage, direct Production runtime facts, provider account facts, provider public legal material and protected producer acceptance are separate authorities. A provider can be technically active while exact-SHA release acceptance or account/legal facts remain open.

## Current attributable provider signals — 2026-09-10 addendum

| Provider / service | Current attributable fact | Current evidence state | Still required before final contractual disclosure |
| --- | --- | --- | --- |
| Vercel | Connected team `renanescola40-afks-projects` is Pro. Project `eurocomply-saas` is linked to GitHub repo `renanescola40-afk/eurocomply_saas`; configured domains include `www.risckcomply.com` and `risckcomply.com`. Current PR deployment metadata is attributable to the expected repo/branch lineage. | `CURRENT_TEAM_PROJECT_DOMAIN_BINDING_PASS / EXACT_MAIN_PRODUCTION_BINDING_OPEN / ACCOUNT_LEGAL_FACTS_OPEN` | Exact protected-main Production convergence where required; applicable account agreement/DPA, contracting entity, complete processing/support locations, retention and Chapter V treatment |
| Supabase | Connected Production project `tganhbbhfxcpblmgqprg` is `ACTIVE_HEALTHY` in `eu-west-1`, revalidated 2026-09-10; database reports PostgreSQL 17 GA. | `CURRENT_PROJECT_REGION_PASS / ACCOUNT_LEGAL_FACTS_OPEN` | Applicable/superseding account agreement, backup/PITR retention, support/onward-processing locations, transfer/subprocessor treatment and qualified legal interpretation |
| Stripe | Connected Stripe session exposes the LIVE `RISCK COMPLY SAAS` account. The current account-detail call failed at connector execution, so country, business type, contracting entity and transfer fields are not promoted as newly revalidated by this addendum. | `LIVE_ACCOUNT_DISCOVERY_PASS_CURRENT / ACCOUNT_DETAIL_TOOL_BLOCKED / ACCOUNT_LEGAL_FACTS_OPEN` | Successful current account detail/provider contract evidence, seller/operator alignment, applicable DPA/agreement, retention and transfer treatment; paying-customer/VAT closure remains owned by the billing lane |
| Google Workspace | Corporate `risckcomply.com` mail remains a material operational provider based on prior attributable evidence; this addendum did not re-open or manufacture account-contract facts. | `OPERATIONAL_PROVIDER / ACCOUNT_CONTRACT_FACTS_REQUIRE_REVALIDATION` | Current applicable agreement/CDPA incorporation, region/retention settings if material, onward-transfer treatment and qualified legal role |
| GitHub / GitHub Actions | Repository and protected CI/release workflows are actively used. Authorised protected jobs may transiently process Production database data on GitHub-hosted runners. | `MATERIAL_OPERATIONAL_PROVIDER / PROTECTED_RELEASE_GOVERNANCE_ACTIVE` | Applicable company/account DPA and final processing/transfer/legal-role interpretation where required |
| Upstash / Redis | Application source retains distributed Redis-backed rate limiting/security-control integration. Prior exact-release/provider proof remains historical until a current protected provider/runtime producer is accepted. | `RUNTIME_INTEGRATION_PRESENT / CURRENT_PROTECTED_PROVIDER_ACCEPTANCE_OPEN / ACCOUNT_FACTS_OPEN` | Current account owner/plan/region/retention/DPA facts and protected provider/runtime acceptance |
| Sentry | Application/release infrastructure retains Sentry integration. Prior direct release-binding evidence is historical until a current protected provider/runtime producer is accepted. | `RUNTIME_INTEGRATION_PRESENT / CURRENT_PROTECTED_PROVIDER_ACCEPTANCE_OPEN / ACCOUNT_LEGAL_FACTS_OPEN` | Current Production project/account, region, plan/retention, DPA acceptance/applicability, scrubbing/data categories and transfer treatment |
| PostHog | Connected PostHog access was revalidated on 2026-09-10. Exactly one accessible project was returned (`Default project`, project id `255188`); it reports `ingested_event=false` and no configured application URLs. Those facts are incompatible with promoting that connected project as the attributed RISCK COMPLY Production analytics project. Repository source continues to target PostHog EU ingestion endpoints, which proves implementation/configuration only. | `CONNECTED_PROJECT_REVALIDATED_NON_PRODUCTION / INGESTED_EVENT_FALSE / PRODUCTION_ACCOUNT_RECOVERY_OPEN / ACCOUNT_FACTS_OPEN` | Recover or connect the actual Production PostHog project/account and then confirm owner/plan, region, retention, account-linked DPA evidence, onward-transfer facts and final analytics/consent legal approval. Settings observed on the non-Production connected project must not be represented as Production settings. |
| Resend / transactional email | Historical real delivery and provider-framework evidence exist; current exact-release account/provider acceptance is not credited by this addendum. | `HISTORICAL_DELIVERY_PROVEN / CURRENT_EXACT_RELEASE_BINDING_OPEN` | Current Production binding, account/entity/plan/region/retention and applicable agreement/DPA/transfer facts |
| Google OAuth / Google Identity | Application uses Google authentication through Supabase Auth; exact current account legal/processing facts are not established by this register. | `RUNTIME_INTEGRATION_PRESENT / ACCOUNT_LEGAL_FACTS_OPEN` | Applicable contracting terms, role, processing/access locations, retention and transfer interpretation where required |
| Malware/content scanner | Upload policy can require provider-backed scanning when enabled; this register does not establish a current external scanner provider/account. | `CONDITIONAL_UNVERIFIED` | If enabled, confirm active provider/scope, data categories, region, retention and legal/transfer terms before buyer reliance |
| Direct SaaS model provider | No direct customer-runtime AI/model provider is established by this register. Founder-operated external AI use outside direct SaaS runtime is a separate operational fact. | `DIRECT_RUNTIME_INTEGRATION_NOT_IDENTIFIED` | If introduced, identify provider/workspace, role, region, retention/training policy, DPA/transfer terms and customer-content policy before disclosure |

## Prior runtime overlay and historical evidence

`docs/trust/evidence/2026-09-09-provider-current-overlay.md` remains the authority for the exact runtime observations it captured on 2026-09-09. Older 2026-08-24 provider snapshots and release proofs remain historical provenance.

A newer connected-account check does **not** retroactively convert an older runtime artifact into current exact-release proof. Conversely, an older runtime artifact does not override a newer successfully revalidated account/project field.

## PostHog account boundary — current revalidation

The 2026-09-10 connector inspection materially narrows the PostHog uncertainty without closing Production attribution:

```text
POSTHOG_CONNECTED_PROJECT_REVALIDATED_2026_09_10=PASS
POSTHOG_CONNECTED_PROJECT_ID=255188
POSTHOG_CONNECTED_PROJECT_NAME=Default_project
POSTHOG_CONNECTED_PROJECT_INGESTED_EVENT=false
POSTHOG_CONNECTED_PROJECT_APP_URLS=EMPTY
POSTHOG_CONNECTED_PROJECT_PROMOTED_AS_PRODUCTION=false
POSTHOG_PRODUCTION_ACCOUNT_RECOVERY=OPEN
POSTHOG_PRODUCTION_DPA_ACCOUNT_EVIDENCE=OPEN
```

No API token, credential or secret from the connected provider inspection is retained in this evidence register. Retention/session-recording settings visible on the connected project are not promoted as RISCK COMPLY Production settings because the project is not attributed to Production.

## Billing/customer evidence boundary

Provider disclosure does not determine whether a subscription is a legitimate paying-customer authority event. Platform-proof fixtures, seeded/compatibility rows and generic LIVE account discovery remain non-crediting for a real customer lifecycle unless the billing evidence contract is satisfied. Billing/VAT/customer-lifecycle closure remains a separate commercial lane.

## Evidence rules

- Runtime/configuration facts require attributable Production evidence for the release being claimed.
- Direct runtime evidence does not substitute for a protected exact-SHA producer where the control requires protected acceptance.
- Connected project/account facts close only the fields successfully returned by the connected authority.
- A failed provider-detail lookup does not license reuse of stale detail fields as if they were current.
- Public provider documents establish general frameworks only; they do not prove account-specific acceptance, custom terms, final legal role or transfer treatment.
- An assurance account is not Production evidence unless attributable to the Production integration.
- Plan level, billing entity or EU project region is not by itself proof of complete processing locations or Chapter V treatment.
- Do not retain API keys, tokens, passwords, connection strings, webhook secrets, private KYC records, private contracts or unnecessary user-level identity data.

## Legal interpretation boundary

The following remain `QUALIFIED_HUMAN_REQUIRED` where applicable:

- controller/processor/subprocessor/independent-controller role allocation;
- lawful-basis descriptions;
- final Article 28 DPA sufficiency;
- international-transfer treatment;
- provider/subprocessor authorisation, notice and objection model;
- analytics/cookie/consent legal requirements;
- retention/legal-hold decisions;
- final Privacy Policy, Terms and DPA language.

Public/provider account facts reduce uncertainty but are not a substitute for confirming the applicable agreement and obtaining qualified legal review where required.

## External assurance boundary

- qualified EU AI Act/legal workstreams accepted: `0/8` unless genuine accepted artifacts say otherwise;
- independent pentest/retest state is owned by the external security-assurance lane and is not promoted here;
- Portuguese VAT/seller treatment is owned by the billing/legal seller-facts lane;
- genuine paid-customer lifecycle evidence is owned by the billing lane.

These independent gates must not be silently promoted by provider-disclosure work.

## Closure state

```text
PROVIDER_FACTUAL_RECONCILIATION=CURRENT_CONNECTED_ACCOUNT_ADDENDUM_ACTIVE
VERCEL_TEAM_PROJECT_DOMAIN_BINDING=PASS_CURRENT_2026-09-10
SUPABASE_PROJECT_REGION=PASS_CURRENT_2026-09-10
STRIPE_LIVE_ACCOUNT_DISCOVERY=PASS_CURRENT_2026-09-10
STRIPE_ACCOUNT_DETAIL_REVALIDATION=TOOL_BLOCKED
POSTHOG_CONNECTED_PROJECT_REVALIDATION=PASS_NON_PRODUCTION
POSTHOG_PRODUCTION_ACCOUNT_RECOVERY=OPEN
RUNTIME_BINDING_PROVEN=PARTIAL_BY_PROVIDER
EXACT_MAIN_PRODUCTION_BINDING=OPEN_WHERE_REQUIRED
ACCOUNT_FACTS_OPEN=OPEN_BY_PROVIDER
ACCOUNT_LEGAL_FACTS_OPEN=OPEN
PRIVACY_GDPR_LEGAL_INTERPRETATION=WAITING_QUALIFIED_HUMAN
PROTECTED_PROVIDER_RUNTIME_ACCEPTANCE=OPEN
SUBPROCESSOR_DPA_REGISTER=STRUCTURE_RECONCILED_FINAL_ACCEPTANCE_OPEN
```
