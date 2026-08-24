# Subprocessor Register — Review Draft

**Status:** `REVIEW_DRAFT` · `PRODUCTION_CONFIGURATION_REQUIRED` · `COUNSEL_DECISION_REQUIRED`

Technical runtime activity and contractual publication readiness are tracked separately. A provider may be factually active from attributable Production evidence while its account owner/plan, legal entity, region, DPA applicability, retention and transfer treatment remain open. A factually active row is **not** by itself a counsel-approved processor/subprocessor/controller classification or a final contractual disclosure.

| Provider/service | Candidate purpose | Candidate data | Current status | Facts required before publication |
|---|---|---|---|---|
| Vercel | Hosting, deployment, edge delivery and logs | traffic, deployment and diagnostic metadata | Current retained Production deployment is `dpl_HjY8...` on `main@7c5f344d...`; connected team Pro; standard Pro DPA/SCC framework evidenced; account-specific custom/superseding agreement state open | applicable agreement/acceptance evidence, processing locations where relevant, effective log-retention/add-on state and qualified legal interpretation |
| Supabase | Database, authentication, storage and RLS | accounts, organisations, workflow content and audit events | Production active in `eu-west-1`; connected organisation Pro; standard DPA framework evidence exists; standard Pro daily-backup access 7 days; PITR account state open | superseding agreement check, PITR/effective retention, transfer/subprocessor treatment and qualified legal interpretation |
| Stripe | Checkout, subscriptions, portal and payment processing | billing identifiers, subscription status and payment metadata | LIVE account/country `PT` proven; account remains `business_type=individual`; operator/entity alignment open | final operator/entity alignment, applicable DPA/agreement, enabled-service data categories, retention and transfer terms |
| Google OAuth / Google Identity | Optional authentication and identity federation | authentication identifiers and provider-returned profile metadata | Production use proven by non-zero aggregate provider identities and code-level Google OAuth implementation; Google API/OAuth policy framework evidenced; final legal role intentionally unresolved | applicable contracting entity/terms for the OAuth client, DPA applicability if any, region, retention, transfer treatment and counsel decision on controller/processor/subprocessor role |
| Google Workspace | Corporate email and business communications | corporate/support contacts, message metadata, message content and attachments where used | Account-specific billing proves `risckcomply.com` uses Google Workspace Business Starter with 2 licenses and identifies Google Cloud EMEA Limited as the billed EMEA entity; provider CDPA/SCC framework exists generally; exact account incorporation/opt-in state not established | confirm exact Workspace agreement/CDPA incorporation or opt-in state, admin-configured data region/retention if material, onward-transfer treatment and counsel decision on role/disclosure |
| GitHub / GitHub Actions | Source delivery, CI/CD and protected recovery/security workflows | repository/workflow metadata, security evidence and transient Production data in recovery jobs | Material operational use proven; protected recovery can process Production database data on ephemeral hosted runners; repository owned by Personal User account | applicable company/account agreement and DPA treatment, final legal role, processing/transfer treatment and customer disclosure wording |
| Sentry | Error monitoring and diagnostics | error context and diagnostic metadata | Retained exact-current Production evidence proves environment `production` and release `7c5f344d...`; organisation region/DPA acceptance facts remain open | organisation region, plan/retention, DPA acceptance actor/timestamp, scrubbing/data categories, transfer terms and legal role |
| PostHog | Product analytics | consented analytics events and identifiers | Production EU endpoint binding proven; connected assurance project does not match Production; Production account recovery and account facts open | recover actual Production project/account, confirm owner/plan/region/retention, obtain account-linked DPA evidence, transfer terms and final consent-policy legal approval |
| Upstash | Distributed rate limiting and security-abuse control state | operational request/control metadata and identifiers | Retained exact-current Production proof shows canonical `/api/billing/catalog` returned 200 on `dpl_HjY8...` / `7c5f344d...`; the route traverses the Production fail-closed billing Redis limiter before the normal response. Provider DPA/transfer/subprocessor framework is evidenced generally. | account owner/plan, region(s), retention/deletion, account-specific DPA applicability/acceptance, transfer treatment and counsel role decision |
| Resend / email provider | Transactional and support email | email address, message metadata and content | Historical real delivery proven; provider entity/DPA/SCC/subprocessor/deletion framework evidenced generally; exact-current Production binding open | current active binding; account owner/plan, applicable agreement/DPA acceptance evidence, effective region/retention/transfer treatment and templates |
| Support provider | Customer support | contacts, tickets and attachments | Provider fact required | provider, region, access, DPA and retention |
| Malware/content scanner | Enterprise upload scanning when enabled | uploaded content and scan metadata | Exact-current provider identity/binding not established | active provider, scope, region, retention, DPA and transfer terms if enabled |
| AI/model provider | Optional AI-assisted features or founder-operated external AI use | prompts, outputs and permitted customer content | Founder operational use outside direct SaaS runtime recorded; direct runtime integration not identified; counsel decision required | provider/workspace, legal role, region, retention, training policy, DPA and transfer terms; customer-content policy |

## Retained runtime evidence for counsel traceability

- Upstash: `docs/trust/evidence/2026-08-24-upstash-exact-current-runtime-reproof.md`
- Sentry: `docs/trust/evidence/2026-08-24-sentry-exact-current-runtime-reproof.md`

These files establish runtime binding only and must not be interpreted as DPA acceptance, region, retention, transfer sufficiency or final provider role.

## Counsel decisions explicitly required

Counsel must decide, rather than infer from this factual register:

1. whether Google OAuth/Google Identity should be disclosed as an independent controller, processor, subprocessor or other third-party identity provider for the actual flow;
2. whether Google Workspace should be disclosed as a processor/subprocessor or other operational communications provider for corporate support/security/procurement/legal mail, and whether the account's applicable Workspace agreement incorporates the provider CDPA without further action;
3. whether GitHub Actions' transient Production processing in protected recovery/security workflows requires customer-facing subprocessor/provider disclosure and what contractual basis applies to the current Personal User account;
4. final role allocation for every other provider and any distinction between provider-generated data and customer personal data;
5. general authorisation, advance notice period, objection grounds, material-change handling and customer remedies for providers legally treated as subprocessors.

## Publication gate

Before this register becomes final or contractual:

1. reconcile actual Production/operational provider configuration with attributable runtime/account evidence;
2. distinguish technically active providers from merely configured/candidate providers;
3. confirm legal entity, purpose, data categories, region/location and retention/deletion behavior;
4. record account-specific DPA/SCC/transfer and provider-notice status where applicable;
5. obtain qualified privacy/legal counsel approval of role allocation and disclosure wording;
6. date and version the approved register and archive the version disclosed to each customer.

A candidate row is not evidence that a provider is active. Conversely, technical runtime or operational account evidence that a provider is active is not proof that its DPA, transfer mechanism or legal classification has been approved.
