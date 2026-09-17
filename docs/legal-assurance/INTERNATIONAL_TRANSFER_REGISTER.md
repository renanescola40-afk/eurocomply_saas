# RISCK COMPLY — International Transfer Register

Date: 2026-09-17  
Baseline: GDPR Chapter V. This register separates (a) whether a provider is active, (b) account/project region, (c) provider contractual transfer framework, and (d) whether a particular RISCK COMPLY data flow actually relies on that mechanism.

A US-owned provider does not by itself prove a restricted transfer. An EU hosting region does not by itself prove that support, telemetry, subprocessors or onward access never leave the EEA. Conversely, lack of an account-specific support email does not erase a DPA that the provider's current terms expressly incorporate into the applicable service agreement.

## Current provider / transfer matrix

| Provider / service | Current attributable account/use fact | Current transfer/DPA mechanism evidence | Current state | Exact remaining closure condition |
| --- | --- | --- | --- | --- |
| Supabase | Production project `tganhbbhfxcpblmgqprg` is active in `eu-west-1` | Supabase Privacy Team confirmed that, from 2026-08-01, its general customer DPA is incorporated into Terms and applies without separate signature. Current 2026 DPA incorporates EU SCCs for covered transfers and treats execution of the Agreement as signing the SCCs | `PROJECT_REGION_PASS / DPA_FRAMEWORK_PASS / SCC_FRAMEWORK_PASS / FLOW_FACTS_PARTIAL` | Confirm whether a separately negotiated agreement applies, then map actual support/access/onward-transfer/backup flows and any required supplementary-measure/TIA decision |
| Vercel | Connected team is Pro; Production project/domains are attributable | Current Vercel DPA (effective 2026-03-31) expressly applies to Pro and Enterprise customers; it defines Vercel as processor for Customer Data and incorporates 2021 EU SCC modules for applicable cross-border transfers | `CURRENT_PRO_ACCOUNT_PASS / DPA_APPLICABILITY_SUPPORTED / SCC_FRAMEWORK_PASS / LOCATION_RETENTION_PARTIAL` | Freeze enabled service/data categories and complete processing/support locations, retention and subprocessor mapping; exact-current-main deployment remains a Prompt 1 issue, not a Chapter V prerequisite by itself |
| Cloudflare | Canonical public hostname is proxied through Cloudflare; DNS/DNSSEC/edge security are operational | Current Cloudflare DPA v6.4 (effective 2026-04-03) forms part of Enterprise, self-serve or other applicable Main Agreement and contains EEA/Swiss/UK transfer terms | `ACTIVE_EDGE_PROVIDER / DPA_FRAMEWORK_AVAILABLE / ACCOUNT_PRODUCT_FLOW_PARTIAL` | Attribute current Cloudflare account/plan and enabled products/logging; map edge log/support/subprocessor access and the mechanism applicable to any restricted transfer |
| Stripe | LIVE RISCK COMPLY account exists; Prompt 3 owns seller/VAT/fiscal/account closure | Provider privacy/transfer framework must be reconciled against the actual LIVE account and billing flows rather than inferred here | `ROUTED_PROMPT_3 / TRANSFER_ROLE_PARTIAL` | Prompt 3 closes account/fiscal/provider facts; this register then records the actual controller/processor/transfer treatment for each billing flow |
| Google OAuth / Identity | Production authentication integration exists through Supabase Auth | No account-specific Google identity agreement/transfer mapping has been frozen in this lane | `ACTIVE_IDENTITY_PROVIDER / TRANSFER_MAPPING_OPEN` | Identify applicable account terms, provider role, processing/access locations and Chapter V basis for the actual OAuth data flow where required |
| Google Workspace | Corporate mail is operational and can process support/legal/procurement contacts/content | Current Workspace agreement/CDPA and admin region/retention settings have not been revalidated here | `ACTIVE_OPERATIONAL_PROVIDER / ACCOUNT_TRANSFER_FACTS_OPEN` | Revalidate account agreement/CDPA incorporation, relevant data region/retention settings, subprocessors and transfer framework for support/business communications |
| GitHub / Actions | Repository and protected CI/CD are active; authorised jobs may transiently handle Production data | Account/company DPA applicability and hosted-runner transfer treatment are not yet frozen | `ACTIVE_OPERATIONAL_PROVIDER / RUNNER_TRANSFER_FACTS_OPEN` | Confirm applicable agreement/DPA and map data categories, runner locations/access and restricted-transfer mechanism for workflows that actually process Production data |
| Sentry | Error-monitoring integration exists | Provider support states the standard DPA is available to all plans and contains EU SCC safeguards. Human support separately stated that self-service support does not provide account-specific confirmation of acceptance/region | `DPA_FRAMEWORK_AVAILABLE / ACCOUNT_ACCEPTANCE_AND_REGION_OPEN` | Inspect current organization Legal & Compliance acceptance plus Production project region, retention, scrubbing/data categories and subprocessor facts |
| PostHog | Human provider response confirmed EU/Frankfurt for the discussed EU Cloud organization; currently connected `Default project` is not attributed as RISCK COMPLY Production | Human provider response identifies PostHog, Inc. and the DPA/transfer section; PandaDoc confirmed `PostHog DPA — Samuel Cerqueira, Unipessoal, Lda` completed by all participants on 2026-09-01 | `DPA_EXECUTION_PASS / DISCLOSED_EU_REGION_PASS / PRODUCTION_PROJECT_ATTRIBUTION_OPEN` | Recover/revalidate the actual Production project if analytics is active, then confirm current retention and actual onward-transfer/subprocessor path. Do not apply the unrelated connected project's settings to Production |
| Upstash / Redis | Rate-limit/security Redis integration is active; current account plan/region still requires console revalidation | Human Upstash support states standard DPA is automatically incorporated into Terms; self-service counterparty is Upstash, Inc.; DPA incorporates SCC Module 2 and EU-US DPF for described transfers. Support states automated backup expiry is 1 day or up to 3 days with Prod Pack | `DPA_FRAMEWORK_PASS_ATTRIBUTABLE / SCC_DPF_FRAMEWORK_PASS / ACCOUNT_REGION_PLAN_OPEN` | Verify actual database plan, primary/read regions and whether Prod Pack applies, then map actual key/data categories against transfer/retention framework |
| Resend | Transactional-email integration and Production policy are present; historical real delivery exists | Current Resend DPA (updated 2026-08-27) is incorporated into the applicable Terms/Agreement and includes SCCs; it states the Addendum is binding on entering the Agreement or execution | `ACTIVE_TRANSACTIONAL_PROVIDER / DPA_SCC_FRAMEWORK_AVAILABLE / ACCOUNT_FACTS_PARTIAL` | Attribute the current Production Resend account/contracting profile, retention, subprocessors and actual sending/data locations before final customer disclosure |

## Providers not currently credited as active transfer paths

- No direct customer-facing model provider is currently identified in the SaaS runtime.
- No active external malware/content-scanner provider/account is currently attributed. If enabled, add it before relying on the scanner or disclosing a transfer posture.

## Chapter V decision rule

For each actual data flow that leaves or can be accessed outside the EEA, retain one attributable conclusion:

- `NO_RESTRICTED_TRANSFER_EVIDENCED`, only where the complete relevant processing/access chain supports it;
- `ADEQUACY_DECISION` / recognised framework, with the exact applicable scope;
- `SCC_2021_914`, with the applicable module(s) and agreement applicability;
- another lawful Chapter V mechanism with attributable evidence; or
- `OPEN`, where account/use facts are insufficient.

A provider's generic SCC language closes the **framework availability** question, not automatically the full flow-specific legality question. A TIA/supplementary-measures assessment is required only where the actual transfer facts and chosen mechanism make it necessary; it is not manufactured as a universal checkbox.

Do **not** use Commission Implementing Decision (EU) 2021/915 controller-processor clauses as the Chapter V international-transfer SCC mechanism. Article 28 contracting and Chapter V transfer safeguards are separate controls.

## Attributable evidence newly credited

```text
SUPABASE_DPA_AUTOMATIC_INCORPORATION=PASS_PROVIDER_CONFIRMED
SUPABASE_2026_DPA_EU_SCC_FRAMEWORK=PASS_PUBLIC_PROVIDER_DOCUMENT
VERCEL_CURRENT_PLAN=PRO_CONNECTED_ACCOUNT
VERCEL_2026_DPA_APPLIES_TO_PRO=PASS_PUBLIC_PROVIDER_DOCUMENT
VERCEL_2026_DPA_EU_SCC_FRAMEWORK=PASS_PUBLIC_PROVIDER_DOCUMENT
CLOUDFLARE_ACTIVE_EDGE=PASS_RUNTIME_EVIDENCE
CLOUDFLARE_2026_DPA_FRAMEWORK=PASS_PUBLIC_PROVIDER_DOCUMENT
POSTHOG_DPA_COMPLETED_ALL_PARTICIPANTS=PASS_ATTRIBUTABLE
POSTHOG_DISCLOSED_EU_FRANKFURT_REGION=PASS_HUMAN_PROVIDER_RESPONSE
UPSTASH_DPA_AUTOMATIC_INCORPORATION=PASS_HUMAN_PROVIDER_RESPONSE
UPSTASH_SCC_MODULE_2_PLUS_DPF_FRAMEWORK=PASS_HUMAN_PROVIDER_RESPONSE
RESEND_2026_DPA_AND_SCC_FRAMEWORK=PASS_PUBLIC_PROVIDER_DOCUMENT
```

## What remains genuinely open

The remaining transfer gap is no longer “we have no provider DPA information.” It is narrower and factual:

1. final active-account/project identity for PostHog Production and current Sentry/Resend details;
2. actual Upstash region/plan and Cloudflare enabled account products/logging;
3. Google Identity/Workspace and GitHub account-agreement/processing-path facts;
4. Stripe transfer/privacy facts routed through Prompt 3;
5. flow-by-flow support/onward-access and retention facts where material; and
6. any TIA/supplementary-measures decision that becomes necessary after those actual transfer facts are known.

## Current terminal state

```text
ACTIVE_PROVIDER_INVENTORY=SUBSTANTIALLY_RECONCILED
PROVIDER_DPA_FRAMEWORKS=ADVANCED_ATTRIBUTABLE
PROVIDER_SCC_FRAMEWORKS=ADVANCED_ATTRIBUTABLE
POSTHOG_ACCOUNT_LINKED_DPA=PASS
SUPABASE_DPA_GENERAL_ROUTE=PASS_PROVIDER_CONFIRMED
VERCEL_DPA_PRO_APPLICABILITY=PASS_PUBLIC_TERMS_PLUS_CONNECTED_PRO_PLAN
UPSTASH_DPA_FRAMEWORK=PASS_PROVIDER_CONFIRMED
TRANSFER_LOCATIONS=PARTIAL
FLOW_SPECIFIC_CHAPTER_V_MAPPING=PARTIAL
TIA_SUPPLEMENTARY_MEASURES=ONLY_WHERE_ACTUAL_FLOW_REQUIRES
INTERNATIONAL_TRANSFERS=PARTIAL_NOT_FINAL
QUALIFIED_EXTERNAL_LEGAL_REVIEW=ONLY_IF_CURRENT_SCOPE_TRIGGER_REQUIRES
```

This register is not a legal opinion, regulator approval or compliance guarantee. It records the strongest attributable current facts while preserving real unresolved account/data-flow questions.