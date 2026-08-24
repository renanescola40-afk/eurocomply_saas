# Subprocessor Register — Review Draft

**Status:** `REVIEW_DRAFT` · `PRODUCTION_CONFIGURATION_REQUIRED` · `COUNSEL_DECISION_REQUIRED`

Technical runtime activity and contractual publication readiness are tracked separately. A provider may be factually active from attributable Production evidence while its account owner/plan, legal entity, region, DPA applicability, retention and transfer treatment remain open. A factually active row is **not** by itself a counsel-approved processor/subprocessor/controller classification or a final contractual disclosure.

| Provider/service | Candidate purpose | Candidate data | Current status | Facts required before publication |
|---|---|---|---|---|
| Vercel | Hosting, deployment, edge delivery and logs | traffic, deployment and diagnostic metadata | Current Production release attributable; connected team Pro; standard Pro DPA/SCC framework evidenced; account-specific custom/superseding agreement state open | applicable agreement/acceptance evidence, processing locations where relevant, effective log-retention/add-on state and qualified legal interpretation |
| Supabase | Database, authentication, storage and RLS | accounts, organisations, workflow content and audit events | Production active in `eu-west-1`; connected organisation Pro; standard DPA framework evidence exists; standard Pro daily-backup access 7 days; PITR account state open | superseding agreement check, PITR/effective retention, transfer/subprocessor treatment and qualified legal interpretation |
| Stripe | Checkout, subscriptions, portal and payment processing | billing identifiers, subscription status and payment metadata | LIVE account/country `PT` proven; account remains `business_type=individual`; operator/entity alignment open | final operator/entity alignment, applicable DPA/agreement, enabled-service data categories, retention and transfer terms |
| Google OAuth / Google Identity | Optional authentication and identity federation | authentication identifiers and provider-returned profile metadata | Production use proven by non-zero aggregate provider identities and code-level Google OAuth implementation; Google API/OAuth policy framework evidenced; final legal role intentionally unresolved | applicable contracting entity/terms for the OAuth client, DPA applicability if any, region, retention, transfer treatment and counsel decision on controller/processor/subprocessor role |
| GitHub / GitHub Actions | Source delivery, CI/CD and protected recovery/security workflows | repository/workflow metadata, security evidence and transient Production data in recovery jobs | Material operational use proven; protected recovery can process Production database data on ephemeral hosted runners; repository owned by Personal User account | applicable company/account agreement and DPA treatment, final legal role, processing/transfer treatment and customer disclosure wording |
| Sentry | Error monitoring and diagnostics | error context and diagnostic metadata | Exact current Production release binding proven; organisation region/DPA acceptance facts remain open | organisation region, plan/retention, DPA acceptance actor/timestamp, scrubbing/data categories, transfer terms and legal role |
| PostHog | Product analytics | consented analytics events and identifiers | Production EU endpoint binding proven; connected assurance project does not match Production; Production account recovery and account facts open | recover actual Production project/account, confirm owner/plan/region/retention, obtain account-linked DPA evidence, transfer terms and final consent-policy legal approval |
| Upstash | Distributed rate limiting and security-abuse control state | operational request/control metadata and identifiers | Exact-current Production runtime binding proven; provider DPA/transfer/subprocessor framework evidenced generally; account facts open | account owner/plan, region(s), retention/deletion, account-specific DPA applicability/acceptance, transfer treatment and counsel role decision |
| Resend / email provider | Transactional and support email | email address, message metadata and content | Historical real delivery proven; provider entity/DPA/SCC/subprocessor/deletion framework evidenced generally; exact-current Production binding open | current active binding; account owner/plan, applicable agreement/DPA acceptance evidence, effective region/retention/transfer treatment and templates |
| Support provider | Customer support | contacts, tickets and attachments | Provider fact required | provider, region, access, DPA and retention |
| Malware/content scanner | Enterprise upload scanning when enabled | uploaded content and scan metadata | Exact-current provider identity/binding not established | active provider, scope, region, retention, DPA and transfer terms if enabled |
| AI/model provider | Optional AI-assisted features or founder-operated external AI use | prompts, outputs and permitted customer content | Founder operational use outside direct SaaS runtime recorded; direct runtime integration not identified; counsel decision required | provider/workspace, legal role, region, retention, training policy, DPA and transfer terms; customer-content policy |

## Counsel decisions explicitly required

Counsel must decide, rather than infer from this factual register:

1. whether Google OAuth/Google Identity should be disclosed as an independent controller, processor, subprocessor or other third-party identity provider for the actual flow;
2. whether GitHub Actions' transient Production processing in protected recovery/security workflows requires customer-facing subprocessor/provider disclosure and what contractual basis applies to the current Personal User account;
3. final role allocation for every other provider and any distinction between provider-generated data and customer personal data;
4. general authorisation, advance notice period, objection grounds, material-change handling and customer remedies for providers legally treated as subprocessors.

## Publication gate

Before this register becomes final or contractual:

1. reconcile actual Production/operational provider configuration with attributable runtime/account evidence;
2. distinguish technically active providers from merely configured/candidate providers;
3. confirm legal entity, purpose, data categories, region/location and retention/deletion behavior;
4. record account-specific DPA/SCC/transfer and provider-notice status where applicable;
5. obtain qualified privacy/legal counsel approval of role allocation and disclosure wording;
6. date and version the approved register and archive the version disclosed to each customer.

A candidate row is not evidence that a provider is active. Conversely, technical runtime evidence that a provider is active is not proof that its DPA, transfer mechanism or legal classification has been approved.
