# Provider factual evidence register

**Status:** `CURRENT_OVERLAY_ACTIVE / CONTRACTUAL_FACTS_IN_REVIEW`  
**Current factual overlay:** `docs/trust/evidence/2026-09-09-provider-current-overlay.md`  
**Current protected main at overlay capture:** `6f99280779930c60fca6c65350fda0636c664292`  
**Protected Provider Runtime acceptance:** `OPEN`  
**Canonical tracker:** GitHub issue `#1727`

This register separates attributable provider/configuration facts from legal interpretation. It is not a DPA, legal opinion, GDPR-compliance statement, certification, independent pentest, regulator approval, or proof that every public provider term is contractually applicable to the RISCK COMPLY account.

## Current-release authority

For release-specific buyer disclosures, use `docs/trust/evidence/2026-09-09-provider-current-overlay.md` together with the canonical Enterprise release trackers. The previous 2026-08-24 provider snapshot is retained in Git history and evidence files for provenance only; its Vercel deployment, Git SHA, Supabase migration counts, and exact-release provider bindings **must not be represented as current**.

Protected-main lineage, direct Production runtime facts and protected producer acceptance are separate authorities. A provider can be technically active while exact-SHA release acceptance or account/legal facts remain open.

## Fresh attributable provider signals — 2026-09-09

| Provider / service | Current attributable fact | Current evidence state | Still required before final contractual disclosure |
| --- | --- | --- | --- |
| Vercel | Canonical public site is serving; fresh `/api/health` returned HTTP 200 and anonymous `/api/ready` returned HTTP 401 fail-closed. Canonical deployment observed is `dpl_GrWRgzmMnUfBattRgeBX4j3ic8LT`, Git SHA `8a30ca3e6d06a77a83d7f2d10f7cef7edfe040a6`, which is stale relative to protected main at overlay capture. | `CURRENT_PUBLIC_RUNTIME_PROVEN / EXACT_MAIN_PRODUCTION_BINDING_OPEN / PROTECTED_PROVIDER_RUNTIME_OPEN` | Governed exact-SHA Production convergence and protected runtime/provider evidence; account-specific contractual/legal interpretation remains separate. |
| Supabase | Production project `tganhbbhfxcpblmgqprg` is live. Fresh read-only inspection shows migration ledger count `90`, head `20260909006900`, and the current V41 selected inventory present `13/13`. `organization_members.status` and `app_private.has_commercial_authority(uuid)` are present. RLS + FORCE RLS are enabled on reviewed commercial tenant surfaces. | `V41_LIVE_SCHEMA_EFFECT_PASS / PAYMENT_FIRST_LIVE / GOVERNED_V41_PROVENANCE_OPEN` | Complete retained governed provenance/reconciliation evidence. Do not reapply, repair, roll back, or issue ad-hoc DDL merely to manufacture provenance. |
| Stripe | Canonical LIVE account is `acct_1U6IuJGt3cgjPOtq` / RISCK COMPLY SAAS. Public initial self-serve paid Checkout is fail-closed until paid-GA acceptance. Three processed `livemode=true` events currently present in the database are platform-proof Checkout fixtures and do not satisfy exact subscription authority. | `LIVE_CONTROL_PLANE_PROVEN / PLATFORM_PROOF_EVENTS_NON_CREDITING / LEGITIMATE_LIVE_SUBSCRIPTION_AUTHORITY_0` | Attributable VAT/tax facts, exact-SHA Production acceptance, applicable account/legal agreement facts, and a genuine normal customer lifecycle satisfying the exact authority contract. |
| Google Workspace | Corporate `risckcomply.com` mail is actively used for operational communications. Earlier account-specific evidence exists but was not fully revalidated in this release overlay. | `OPERATIONAL_USE_CURRENT / ACCOUNT_CONTRACT_FACTS_REQUIRE_REVALIDATION` | Current account agreement/CDPA incorporation, region/retention settings if material, and qualified legal role/transfer interpretation. |
| GitHub / GitHub Actions | Repository and protected CI/release workflows are actively used. Production-sensitive jobs use protected environments and retained evidence boundaries. | `MATERIAL_OPERATIONAL_PROVIDER / PROTECTED_RELEASE_GOVERNANCE_ACTIVE` | Applicable company/account agreement/DPA and final legal/transfer interpretation where required. |
| Upstash / Redis | Application source retains the distributed Redis-backed rate-limit integration. Earlier exact-release/provider evidence is historical until a current protected provider/runtime producer is accepted. | `RUNTIME_BINDING_PROVEN=HISTORICAL_PARTIAL / ACCOUNT_FACTS_OPEN` | Current exact-release provider proof plus account plan/owner/region/DPA facts. |
| Sentry | Application/release infrastructure retains Sentry integration. Earlier direct exact-release evidence is historical until refreshed protected provider/runtime acceptance. | `RUNTIME_BINDING_PROVEN=HISTORICAL_PARTIAL / ACCOUNT_LEGAL_FACTS_OPEN` | Current exact-release producer, account region/plan/retention/DPA acceptance and final transfer/legal interpretation. |
| PostHog | Production source/configuration has historically targeted EU endpoints, but the connected assurance project was not the Production project. | `CONNECTED_ASSURANCE_PROJECT_MISMATCH / ACCOUNT_FACTS_OPEN` | Recover/revalidate the actual Production account/project before account-specific contractual claims. |
| Resend / transactional email | Historical real delivery and provider-framework evidence exist; current exact-release account/provider acceptance is not credited by this overlay. | `HISTORICAL_DELIVERY_PROVEN / CURRENT_EXACT_RELEASE_BINDING_OPEN` | Current Production binding, account/plan/region/retention and applicable agreement/DPA facts. |
| Google OAuth / Google Identity | Application uses Google authentication through Supabase Auth; exact current account legal/processing facts are not established by this register. | `RUNTIME_INTEGRATION_PRESENT / ACCOUNT_LEGAL_FACTS_OPEN` | Applicable contracting terms, DPA/role/region/retention/transfer interpretation where required. |
| Malware/content scanner | Enterprise upload policy requires provider-backed scanning when enabled; this overlay does not establish a current exact-release scanner provider/account. | `CONDITIONAL_UNVERIFIED` | Confirm active provider/scope, data categories, region, retention and legal terms before buyer reliance. |
| OpenAI / ChatGPT — founder operational use outside SaaS runtime | Founder operational use exists outside direct SaaS runtime; no direct customer-runtime OpenAI integration is established by this register. | `FOUNDER_OPERATIONAL_USE_CAPTURED / DIRECT_RUNTIME_INTEGRATION_NOT_IDENTIFIED / ACCOUNT_LEGAL_FACTS_OPEN` | Final internal policy and applicable workspace/legal facts if this operational use becomes material to customer data handling. |

## Billing/customer evidence boundary

A persisted `subscriptions` row is not proof of a paying customer. Ordinary commercial authority requires the exact organization + Stripe customer + Stripe subscription to correlate with a processed `livemode=true` `customer.subscription.created` or `customer.subscription.updated` event under the source contract.

Current read-only reconciliation found no event satisfying that authority contract. Platform-proof Checkout events and seeded/compatibility rows are non-crediting.

## Evidence rules

- Runtime/configuration facts require attributable Production evidence.
- Direct runtime evidence does not substitute for a protected exact-SHA producer where the control requires protected acceptance.
- Public provider documents establish general frameworks only; they do not prove account-specific acceptance, custom terms, final legal role or transfer treatment.
- Historical provider evidence remains useful provenance but must not be relabelled as current-release evidence.
- An assurance account is not Production evidence unless attributable to the Production integration.
- Do not retain API keys, tokens, passwords, connection strings, webhook secrets, private KYC records, private contracts or unnecessary user-level identity data.

## Legal interpretation boundary

The following remain `QUALIFIED_HUMAN_REQUIRED` where applicable:

- controller/processor/subprocessor/independent-controller role allocation;
- lawful-basis descriptions;
- Article 28 DPA sufficiency;
- international-transfer treatment;
- provider/subprocessor authorisation, notice and objection model;
- analytics/cookie/consent legal requirements;
- retention/legal-hold decisions;
- final Privacy Policy, Terms and DPA language.

Public provider terms reduce factual uncertainty but are not a substitute for confirming the actual account agreement and obtaining qualified legal review.

## External assurance boundary

- qualified EU AI Act/legal workstreams accepted: `0/8`;
- independent pentest: application submitted / selection pending;
- retest: not started;
- Portuguese VAT treatment: attributable seller fact remains open;
- legitimate LIVE paid-customer authority: `0` observed under the exact source contract.

These open items prohibit a claim of complete external assurance or final Enterprise procurement acceptance.

## Closure state

`PROVIDER_FACTUAL_RECONCILIATION: CURRENT_OVERLAY_ACTIVE`

`RUNTIME_BINDING_PROVEN: PARTIAL_BY_PROVIDER / EXACT_MAIN_PRODUCTION_OPEN`

`SUPABASE_V41_LIVE: 13/13`

`SUPABASE_V41_GOVERNED_PROVENANCE: OPEN`

`STRIPE_LIVE_CONTROL_PLANE: PROVEN`

`LEGITIMATE_LIVE_SUBSCRIPTION_AUTHORITY: 0`

`CONNECTED_ASSURANCE_PROJECT_MISMATCH: POSTHOG_CONFIRMED / NOT_PRODUCTION`

`ACCOUNT_FACTS_OPEN: OPEN_BY_PROVIDER`

`ACCOUNT_LEGAL_FACTS_OPEN: OPEN`

`PRIVACY_GDPR_LEGAL_INTERPRETATION: WAITING_QUALIFIED_HUMAN`

`PROTECTED_PROVIDER_RUNTIME_ACCEPTANCE: OPEN`

`SUBPROCESSOR_DPA_REGISTER: NO_PASS_YET`
