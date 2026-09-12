# Provider factual evidence register

**Status:** `CURRENT_CONNECTED_ACCOUNT_ADDENDUM_ACTIVE / ATTRIBUTABLE_DPA_EVIDENCE_ADVANCED / CONTRACTUAL_FACTS_IN_REVIEW`  
**Prior runtime overlay:** `docs/trust/evidence/2026-09-09-provider-current-overlay.md`  
**Terminal fact reconciliation:** `docs/legal-assurance/evidence/2026-09-10-terminal-fact-reconciliation.md`  
**Connected-account addendum captured:** `2026-09-10`  
**Protected main at terminal-v2 branch creation:** `43bf6b1368ff7a3b8ead0aa434b83bed9457615e`  
**Observed Production release during legal reconciliation:** `13b19410caa20045b19d98d58df406c43433af5a`  
**Protected Provider Runtime acceptance:** `OPEN`  
**Canonical tracker:** GitHub issue `#1727`

This register separates attributable provider/configuration facts from legal interpretation. It is not a DPA, legal opinion, GDPR-compliance statement, certification, independent pentest, regulator approval, or proof that every public provider term is contractually applicable to every RISCK COMPLY processing path.

## Current authority model

For release-specific runtime claims, retain the exact SHA/deployment/runtime artifact that proved the fact. For connected-account/project facts, use the most recent attributable provider/account evidence only for the fields actually revalidated.

Protected-main lineage, direct Production runtime facts, provider account facts, provider correspondence/contracts, public legal material and protected producer acceptance are separate authorities. A provider can be technically active while transfer/legal facts remain open; conversely, a DPA can be attributable while the actual Production project binding is still unresolved.

## Current attributable provider signals — 2026-09-10 terminal reconciliation

| Provider / service | Current attributable fact | Current evidence state | Still required before final contractual disclosure |
| --- | --- | --- | --- |
| Vercel | Connected team `renanescola40-afks-projects` is Pro. Project `eurocomply-saas` is linked to the expected GitHub repo and domains. Direct connected inspection observed Production deployment `dpl_BznNuFKG8UEh4yW8y9HQyzLXDiJ9` as READY at GitHub SHA `13b19410...`. Later protected-main merges do not retroactively make that Production observation exact-current-main proof. | `CURRENT_TEAM_PROJECT_DOMAIN_BINDING_PASS / PRODUCTION_RELEASE_SHA_ATTRIBUTED / EXACT_MAIN_PRODUCTION_BINDING_OPEN_WHERE_REQUIRED` | Applicable account agreement/DPA, complete processing/support locations, retention and Chapter V treatment; exact-current-main convergence where a release gate requires it |
| Supabase | Connected Production project `tganhbbhfxcpblmgqprg` is `ACTIVE_HEALTHY` in `eu-west-1`. Direct Supabase Privacy Team correspondence dated 2026-08-21 states that from 2026-08-01 the general customer DPA is incorporated into Supabase Terms and customers receive its protections without a separate signature; separately negotiated agreements remain binding. | `CURRENT_PROJECT_REGION_PASS / PROVIDER_DPA_FRAMEWORK_CONFIRMATION_PASS / ACCOUNT_TRANSFER_FACTS_OPEN` | Determine whether any separately negotiated agreement applies; confirm backup/PITR retention, support/onward-processing locations, transfer/subprocessor treatment and qualified legal interpretation |
| Stripe | Connected Stripe session exposes the LIVE `RISCK COMPLY SAAS` account. The current account-detail call failed at connector execution, so country, business type, contracting entity and transfer fields are not promoted as newly revalidated. | `LIVE_ACCOUNT_DISCOVERY_PASS_CURRENT / ACCOUNT_DETAIL_TOOL_BLOCKED / ACCOUNT_LEGAL_FACTS_OPEN` | Successful current account detail/provider contract evidence, seller/operator alignment, applicable DPA/agreement, retention and transfer treatment; paying-customer/VAT closure remains owned by the billing lane |
| Google Workspace | Corporate `risckcomply.com` mail remains a material operational provider based on prior attributable evidence; this pass did not manufacture account-contract facts. | `OPERATIONAL_PROVIDER / ACCOUNT_CONTRACT_FACTS_REQUIRE_REVALIDATION` | Current applicable agreement/CDPA incorporation, region/retention settings if material, onward-transfer treatment and qualified legal role |
| GitHub / GitHub Actions | Repository and protected CI/release workflows are actively used. Authorised protected jobs may transiently process Production database data on GitHub-hosted runners. | `MATERIAL_OPERATIONAL_PROVIDER / PROTECTED_RELEASE_GOVERNANCE_ACTIVE` | Applicable company/account DPA and final processing/transfer/legal-role interpretation where required |
| Upstash / Redis | Application source retains distributed Redis-backed rate limiting/security-control integration. Prior exact-release/provider proof remains historical until a current protected provider/runtime producer is accepted. | `RUNTIME_INTEGRATION_PRESENT / CURRENT_PROTECTED_PROVIDER_ACCEPTANCE_OPEN / ACCOUNT_FACTS_OPEN` | Current account owner/plan/region/retention/DPA facts and protected provider/runtime acceptance |
| Sentry | Application/release infrastructure retains Sentry integration. The legal-reconciliation Production observation exposed a Sentry release signal for the observed Production SHA, but account legal/retention/transfer facts are not closed by that runtime signal. | `RUNTIME_INTEGRATION_PRESENT / CURRENT_PROTECTED_PROVIDER_ACCEPTANCE_OPEN / ACCOUNT_LEGAL_FACTS_OPEN` | Current Production project/account, region, plan/retention, DPA acceptance/applicability, scrubbing/data categories and transfer treatment |
| PostHog | Connected PostHog access revalidation returned one accessible `Default project` (`255188`) with `ingested_event=false` and no configured application URLs, so it is not attributed as the RISCK COMPLY Production analytics project. Separately, a PandaDoc completion notice dated 2026-09-01 states that `PostHog DPA — Samuel Cerqueira, Unipessoal, Lda` was completed by all participants. Repository source targets PostHog EU endpoints. | `CONNECTED_PROJECT_REVALIDATED_NON_PRODUCTION / ACCOUNT_LINKED_DPA_COMPLETION_EVIDENCE_PASS / PRODUCTION_PROJECT_RECOVERY_OPEN` | Recover/connect the actual Production PostHog project if analytics is active; confirm project owner/plan, region, retention, onward-transfer facts and final analytics/consent legal approval. Do not apply settings from project `255188` to Production. |
| Resend / transactional email | Historical real delivery and provider-framework evidence exist; current exact-release account/provider acceptance is not credited by this addendum. | `HISTORICAL_DELIVERY_PROVEN / CURRENT_EXACT_RELEASE_BINDING_OPEN` | Current Production binding, account/entity/plan/region/retention and applicable agreement/DPA/transfer facts |
| Google OAuth / Google Identity | Application uses Google authentication through Supabase Auth; exact current account legal/processing facts are not established by this register. | `RUNTIME_INTEGRATION_PRESENT / ACCOUNT_LEGAL_FACTS_OPEN` | Applicable contracting terms, role, processing/access locations, retention and transfer interpretation where required |
| Malware/content scanner | Upload policy can require provider-backed scanning when enabled; this register does not establish a current external scanner provider/account. | `CONDITIONAL_UNVERIFIED` | If enabled, confirm active provider/scope, data categories, region, retention and legal/transfer terms before buyer reliance |
| Direct SaaS model provider | No direct customer-runtime AI/model provider is established by this register. Founder-operated external AI use outside direct SaaS runtime is a separate operational fact. | `DIRECT_RUNTIME_INTEGRATION_NOT_IDENTIFIED` | If introduced, identify provider/workspace, role, region, retention/training policy, DPA/transfer terms and customer-content policy before disclosure |

## Vercel Production binding — observed legal-reconciliation evidence

```text
VERCEL_PRODUCTION_DEPLOYMENT_ID=dpl_BznNuFKG8UEh4yW8y9HQyzLXDiJ9
VERCEL_PRODUCTION_STATE=READY
VERCEL_PRODUCTION_SHA=13b19410caa20045b19d98d58df406c43433af5a
PROTECTED_MAIN_AT_TERMINAL_V2_BRANCH_CREATION=43bf6b1368ff7a3b8ead0aa434b83bed9457615e
EXACT_CURRENT_MAIN_PRODUCTION_EQUALITY=NOT_CLAIMED
PRIVACY_LIVE_REVIEW_SURFACE=PASS_0_2_REVIEW_AT_OBSERVATION
TERMS_LIVE_REVIEW_SURFACE=PASS_0_2_REVIEW_AT_OBSERVATION
```

The observed READY deployment proves that specific Production release only. It must not be rewritten as exact-current-main equality after later merges.

## Supabase DPA boundary

Direct provider correspondence supports these bounded facts:

```text
SUPABASE_PRIVACY_TEAM_RESPONSE=ATTRIBUTABLE
SUPABASE_GENERAL_CUSTOMER_DPA_INCORPORATED_FROM_2026_08_01=PROVIDER_CONFIRMED
SUPABASE_SEPARATE_SIGNATURE_REQUIRED_FOR_GENERAL_ROUTE=false_PROVIDER_STATEMENT
SUPABASE_EXISTING_SEPARATELY_NEGOTIATED_AGREEMENT_CONTINUES=PROVIDER_STATEMENT
SUPABASE_TIA_RESOURCE_EXISTS=PROVIDER_STATEMENT
```

This closes the prior question of whether the provider says its general customer DPA framework applies automatically. It does **not** prove whether a different negotiated agreement governs this specific account, nor does it decide transfer legality, all processing locations, retention or supplementary measures.

## PostHog account + DPA boundary

```text
POSTHOG_CONNECTED_PROJECT_REVALIDATED_2026_09_10=PASS
POSTHOG_CONNECTED_PROJECT_ID=255188
POSTHOG_CONNECTED_PROJECT_NAME=Default_project
POSTHOG_CONNECTED_PROJECT_INGESTED_EVENT=false
POSTHOG_CONNECTED_PROJECT_APP_URLS=EMPTY
POSTHOG_CONNECTED_PROJECT_PROMOTED_AS_PRODUCTION=false
POSTHOG_ACCOUNT_LINKED_DPA_COMPLETION_NOTICE=PASS_ATTRIBUTABLE
POSTHOG_DPA_NAMED_ENTITY=SAMUEL_CERQUEIRA_UNIPESSOAL_LDA
POSTHOG_PRODUCTION_ACCOUNT_RECOVERY=OPEN
POSTHOG_PRODUCTION_RETENTION_TRANSFER_FACTS=OPEN
```

The DPA completion notice is contract/account evidence; it does not convert an unrelated/non-Production connected project into Production, and it does not by itself establish the applicable international-transfer conclusion.

No API token, credential or secret from connected-provider inspection is retained in this register.

## Billing/customer evidence boundary

Provider disclosure does not determine whether a subscription is a legitimate paying-customer authority event. Platform-proof fixtures, seeded/compatibility rows and generic LIVE account discovery remain non-crediting for a real customer lifecycle unless the billing evidence contract is satisfied. Billing/VAT/customer-lifecycle closure remains a separate commercial lane.

## Evidence rules

- Runtime/configuration facts require attributable Production evidence for the release being claimed.
- Direct runtime evidence does not substitute for a protected exact-SHA producer where a control explicitly requires protected acceptance.
- Connected project/account facts close only fields successfully returned by the connected authority.
- A failed provider-detail lookup does not license reuse of stale fields as current.
- Direct provider correspondence may establish the provider's stated contractual framework; it does not automatically establish qualified legal sufficiency.
- A signed/completed DPA does not by itself prove Production-project attribution or Chapter V compliance.
- Public provider documents establish general frameworks only unless account applicability is separately supported.
- Plan level, billing entity or EU project region is not by itself proof of complete processing locations or Chapter V treatment.
- Do not retain API keys, tokens, passwords, connection strings, webhook secrets, private KYC records, unnecessary private contracts or unnecessary user-level identity data.

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

## External assurance boundary

```text
LEGAL_8_OF_8=0/8_ACCEPTED
MASTER_LEGAL_OPINION=OPEN
```

Independent pentest/retest, Portuguese VAT/seller treatment and genuine paid-customer lifecycle evidence are owned by their separate assurance/commercial lanes and are not promoted here.

## Closure state

The first block preserves the canonical Trust/CI marker vocabulary. The second block records the terminal legal addendum without weakening that contract.

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

```text
PROVIDER_FACTUAL_RECONCILIATION_TERMINAL=CURRENT_TERMINAL_ADDENDUM_ACTIVE
SUPABASE_DPA_PROVIDER_CONFIRMATION=PASS_ATTRIBUTABLE
POSTHOG_ACCOUNT_LINKED_DPA_COMPLETION_EVIDENCE=PASS_ATTRIBUTABLE
POSTHOG_PRODUCTION_ACCOUNT_RECOVERY=OPEN
QUALIFIED_PROVIDER_TRANSFER_LEGAL_ACCEPTANCE=OPEN
```
