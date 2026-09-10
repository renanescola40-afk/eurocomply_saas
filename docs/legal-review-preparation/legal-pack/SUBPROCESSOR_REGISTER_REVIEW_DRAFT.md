# Subprocessor Register — Review Draft

**Status:** `REVIEW_DRAFT` · `PRODUCTION_CONFIGURATION_REQUIRED` · `COUNSEL_DECISION_REQUIRED`

Current factual reconciliation: 2026-09-10.

Technical/runtime activity, account facts and contractual/legal approval are tracked separately. A provider may be factually active while its legal entity, complete processing locations, DPA applicability, retention, transfer treatment or final controller/processor/subprocessor classification remains open. A row in this review draft is therefore **not** by itself contractual authorisation or counsel-approved role allocation.

| Provider/service | Candidate purpose | Candidate data | Current attributable state | Still required before final contractual publication |
|---|---|---|---|---|
| Vercel | Hosting, deployment, edge/runtime delivery and operational logs | Application traffic, deployment metadata and diagnostic/operational data depending on configuration | Connected revalidation 2026-09-10: team is Pro; project `eurocomply-saas` is linked to `renanescola40-afk/eurocomply_saas`; configured domains include `www.risckcomply.com` and `risckcomply.com`. Current project/account binding is proven. | Applicable account agreement/DPA, contracting entity, complete processing/support locations, retention and Chapter V treatment; project plan/domain binding alone is not contractual transfer proof |
| Supabase | Database, authentication, storage and RLS | Accounts, organisations, workspace content, audit/security data and related metadata | Connected Production project `tganhbbhfxcpblmgqprg` revalidated `ACTIVE_HEALTHY` in `eu-west-1` on 2026-09-10 | Account-applicable/superseding agreement check, backup/PITR retention, support/onward-processing locations, transfer/subprocessor treatment and qualified legal interpretation |
| Stripe | Checkout, subscriptions, billing and payment services | Billing identifiers, subscription status and payment metadata; payment-card data is handled by Stripe rather than being intentionally stored by RISCK COMPLY | Connected session exposes the LIVE `RISCK COMPLY SAAS` account on 2026-09-10. Account-detail revalidation failed at connector execution, so country/business-type/contracting-entity details are not promoted as current facts by this revision. | Successful current account-detail/provider-contract evidence, final operator/entity alignment, applicable agreement/DPA, retention and transfer treatment |
| Google OAuth / Google Identity | Authentication and identity federation when enabled | Authentication identifiers and provider-returned profile metadata | Production/runtime integration through Supabase Auth is established; exact account legal/processing facts are not final | Applicable OAuth-client terms/entity, DPA applicability if any, processing/access locations, retention, transfer treatment and qualified role decision |
| Google Workspace | Corporate support, security, procurement and legal/business communications | Corporate/support contacts, message metadata, message content and attachments where used | Operational corporate-mail use is established; prior account-specific plan/EMEA billing evidence is retained as historical/account evidence, not as a processing-location conclusion | Current applicable agreement/CDPA incorporation, admin region/retention settings if material, onward-transfer treatment and final role/disclosure decision |
| GitHub / GitHub Actions | Source delivery, CI/CD and protected release/recovery/security workflows | Repository/workflow metadata, security evidence and transient Production data in authorised recovery/security jobs | Material operational use is established; protected workflows can transiently process Production database data on GitHub-hosted runners | Applicable company/account agreement and DPA treatment, hosted-runner processing/transfer treatment and final customer-facing role/disclosure wording |
| Sentry | Error monitoring and diagnostics | Error context and diagnostic/security metadata depending on configuration | Product/release integration exists; prior exact-release binding evidence is historical until refreshed protected provider/runtime acceptance | Current Production project/account binding, organisation region, plan/retention, DPA applicability/acceptance, scrubbing/data categories, transfer terms and final role |
| PostHog | Optional product analytics | Consented analytics events and identifiers where configured | Production source/configuration historically targeted EU endpoints; the connected assurance project did not match the Production project | Recover/revalidate actual Production project/account, owner/plan, region, retention, account-linked DPA evidence, onward-transfer facts and final analytics/consent legal approval |
| Upstash / Redis | Distributed rate limiting and security-abuse/control state | Operational request/control metadata and identifiers depending on implementation | Distributed Redis-backed integration remains implemented; earlier direct Production proof is historical until current protected provider/runtime acceptance | Current account owner/plan, region(s), retention/deletion, account-specific DPA applicability, transfer treatment and current protected provider/runtime evidence |
| Resend / transactional email | Transactional/support email when used | Email address, delivery/message metadata and message content | Historical real delivery is established; current exact-release account/provider binding is not established by this register | Current active binding; account/entity/plan, region, retention, applicable DPA/agreement, transfer treatment and current templates/data scope |
| Support provider | Customer support if a dedicated external provider is introduced | Contacts, tickets and attachments | No dedicated current provider is asserted by this register | Identify provider and verify scope, region, access, retention, DPA and transfer treatment before disclosure/use |
| Malware/content scanner | Upload scanning when the relevant feature is enabled | Uploaded content and scan metadata | Current exact-release external scanner provider identity/binding is not established | If enabled, identify active provider, scope, regions, retention, DPA and transfer treatment before customer reliance |
| AI/model provider | Direct SaaS AI integration if introduced | Prompts, outputs and permitted customer content | No direct customer-runtime model-provider integration is established by this register. Founder-operated external AI use outside direct SaaS runtime is a separate operational fact. | If direct runtime/customer-content use is introduced, identify provider/workspace, role, regions, retention/training policy, DPA/transfer terms and approved customer-content policy before disclosure |

## Evidence authority and boundaries

Current connected-account/provider facts are reconciled in:

- `docs/legal-assurance/PROVIDER_FACTS_REVALIDATION_2026-09-09.md` including the 2026-09-10 addendum;
- `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md` for release/runtime provenance and non-crediting boundaries;
- `docs/legal-assurance/INTERNATIONAL_TRANSFER_REGISTER.md` for Chapter V decision state;
- canonical External Assurance issue `#1727` for historical/account-provider coordination.

Historical exact-release artifacts remain valid only for their dated release and scope. They must not be relabelled as current merely because the integration remains in source.

## Counsel decisions explicitly required

Qualified legal review must determine, where material:

1. the final controller/processor/subprocessor/independent-controller allocation for each real data flow;
2. whether Google OAuth/Identity, Google Workspace and GitHub Actions require the proposed customer-facing classification/disclosure for the actual processing;
3. final subprocessor general-vs-specific authorisation model;
4. advance notice period, objection grounds/process, material-change handling and remedies;
5. whether each provider transfer requires an adequacy basis, Decision (EU) 2021/914 SCC module(s), supplementary measures/TIA or another Chapter V mechanism;
6. the wording that becomes contractual in the final DPA and customer register.

No provider is promoted to final legal status merely because its runtime/account presence is proven.

## Publication gate

Before this register becomes final or contractual:

1. reconcile the actual Production/operational provider set with attributable runtime/account evidence;
2. distinguish active, conditional and historical-only providers;
3. confirm each active provider's applicable legal entity, purpose, data categories, complete relevant processing/access locations and retention/deletion behavior;
4. retain account-specific DPA/agreement and Chapter V evidence where applicable;
5. approve the Article 28 subprocessor authorisation/notice/objection mechanics;
6. obtain qualified legal role/transfer review;
7. date/version the accepted register and archive the version disclosed with each relevant customer agreement.

```text
SUBPROCESSOR_REGISTER_STRUCTURE=PASS_REVIEW_DRAFT
VERCEL_ACCOUNT_PROJECT_BINDING=PASS_CURRENT_2026-09-10
SUPABASE_PROJECT_REGION=PASS_CURRENT_2026-09-10
STRIPE_LIVE_ACCOUNT_DISCOVERY=PASS_CURRENT_2026-09-10
ACTIVE_PROVIDER_INVENTORY=PARTIAL
ACCOUNT_SPECIFIC_PROVIDER_CONTRACT_FACTS=PARTIAL_OPEN
SUBPROCESSOR_ROLE_ALLOCATION=PENDING_QUALIFIED_REVIEW
SUBPROCESSOR_AUTHORISATION_MODEL=PENDING_CONTRACT_DECISION
SUBPROCESSOR_REGISTER_FINAL=BLOCKED_FINAL_FACTS_AND_QUALIFIED_REVIEW
```

A candidate or active row is not evidence that a DPA, SCC or legal classification has been accepted. Conversely, missing legal acceptance must not be used to deny a provider's proven technical activity.
