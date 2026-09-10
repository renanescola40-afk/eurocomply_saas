# RISCK COMPLY — International Transfer Register

Date: 2026-09-10  
Baseline: GDPR Chapter V. This register separates runtime/account location facts from legal transfer mechanisms. Current connected-account observations are recorded in `PROVIDER_FACTS_REVALIDATION_2026-09-09.md`, including its 2026-09-10 addendum.

A provider being US-owned does not by itself prove an international transfer, and an EU runtime region does not by itself prove that no third-country access or onward transfer can occur.

| Provider / service | Current attributable location/account fact | Transfer mechanism evidence | Current state | Closure requirement |
|---|---|---|---|---|
| Supabase | Connected Production project `tganhbbhfxcpblmgqprg` revalidated `ACTIVE_HEALTHY` in `eu-west-1` on 2026-09-10 | Project region does not prove support/access locations or Chapter V contract treatment; account-specific applicable terms remain separate | `CURRENT_PROJECT_REGION_PASS / LEGAL_BLOCKED` | Confirm contracting entity, support/access locations, subprocessors, account-applicable DPA/transfer terms and backup/support access |
| Vercel | Connected team is Pro; project `eurocomply-saas`, GitHub repo binding and production domains were revalidated on 2026-09-10 | Project/team/domain binding does not establish the complete processing/support location set or an account-applicable Chapter V mechanism | `CURRENT_ACCOUNT_PROJECT_BINDING_PASS / LEGAL_BLOCKED` | Confirm applicable account agreement/DPA, contracting entity, processing/support locations, retention and any required adequacy/SCC/supplementary-measure treatment |
| Stripe | Connected session exposes the LIVE `RISCK COMPLY SAAS` account on 2026-09-10; account-detail revalidation failed at connector execution | Current account contracting/entity/location/transfer details were not successfully revalidated by this lane | `LIVE_ACCOUNT_DISCOVERY_PASS / DETAIL_TOOL_BLOCKED / LEGAL_BLOCKED` | Obtain successful current account/provider contract evidence and determine actual transfer treatment for relevant billing flows |
| Google OAuth / Identity | Production authentication integration exists through Supabase Auth | Contractual role and complete processing/access/transfer framework not final | `BLOCKED` | Confirm OAuth-client applicable terms, provider role, processing/access locations and transfer basis |
| Google Workspace | Corporate mail operational; prior account-specific EMEA billing/plan evidence exists | Billing entity is not a processing/storage location and current account CDPA/incorporation settings are not frozen by this register | `BLOCKED` | Confirm account agreement/CDPA incorporation, relevant admin region/retention settings, onward transfers and legal role |
| GitHub / Actions | Repository/CI use is active; protected workflows can transiently process Production data on GitHub-hosted runners | Current account/company DPA applicability and hosted-runner transfer treatment not final | `BLOCKED` | Confirm applicable agreement/entity, hosted-runner processing/access treatment and whether customer-facing disclosure is required |
| Sentry | Integration remains in product/release infrastructure; prior exact-release runtime evidence is historical until refreshed | Organisation region, retention and account-applicable DPA/transfer position remain open | `BLOCKED` | Confirm current Production project/account, region, retention, scrubbing/data categories, DPA and transfer basis |
| PostHog | Production source/configuration historically targeted EU endpoints; connected assurance project was not the Production project | Actual Production account/project and account-linked DPA remain unresolved | `BLOCKED` | Recover/revalidate actual Production project/account and confirm region, retention, DPA and onward-transfer facts |
| Upstash | Distributed Redis-backed rate-limit integration remains implemented; prior direct runtime proof is historical | Account owner/plan/region/retention/DPA and exact-current protected provider acceptance remain open | `BLOCKED` | Obtain current account/provider and protected runtime evidence; determine transfer treatment for actual data flow |
| Resend / email provider | Historical transactional delivery is evidenced; current exact-release account/provider binding is not established by this register | Account/entity/region/retention/DPA/transfer position remains open | `BLOCKED` | Confirm current active binding and applicable account/provider facts before customer reliance |
| Malware/content scanner | Scanner requirement exists when relevant upload-scanning mode is enabled; current provider identity/binding is not established | No current account/provider transfer evidence | `CONDITIONAL_UNVERIFIED` | If enabled, identify active provider, locations, retention, DPA and transfer basis before customer disclosure |

## Chapter V decision rule

For each active data flow, retain one attributable state:

- `NO_THIRD_COUNTRY_TRANSFER_EVIDENCED`, only where the complete relevant processing/access chain supports that conclusion;
- `ADEQUACY_DECISION`, with the exact applicable adequacy basis and data flow;
- `SCC_2021_914`, with the applicable module(s), executed/accepted agreement evidence and supplementary-measures/TIA assessment where required;
- another lawful Chapter V mechanism with attributable evidence;
- `BLOCKED`, where the necessary facts or legal assessment are insufficient.

Do **not** use Commission Implementing Decision (EU) 2021/915 controller-processor clauses as the Chapter V international-transfer SCC mechanism. Article 28 contracting and Chapter V transfer lawfulness remain separate gates.

## Current terminal state

```text
ACTIVE_PROVIDER_INVENTORY=PARTIAL
SUPABASE_TECHNICAL_REGION=PASS_CURRENT_2026-09-10
VERCEL_TEAM_PROJECT_DOMAIN_BINDING=PASS_CURRENT_2026-09-10
STRIPE_LIVE_ACCOUNT_DISCOVERY=PASS_CURRENT_2026-09-10
STRIPE_ACCOUNT_DETAIL_REVALIDATION=TOOL_BLOCKED
TRANSFER_LOCATIONS=PARTIAL
ACCOUNT_SPECIFIC_TRANSFER_MECHANISMS=BLOCKED
TIA_SUPPLEMENTARY_MEASURES=NOT_TESTED_WHERE_REQUIRED
INTERNATIONAL_TRANSFERS=BLOCKED_FINAL_FACTS_AND_QUALIFIED_REVIEW
```

The repository-controlled transfer register is structurally reconciled and current for the facts above. The remaining closure action is account-specific provider/contract evidence plus qualified transfer analysis where required, not additional generic transfer drafting.
