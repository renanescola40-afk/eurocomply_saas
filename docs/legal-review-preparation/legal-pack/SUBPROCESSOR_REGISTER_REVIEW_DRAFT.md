# Subprocessor Register — Review Draft

**Status:** `REVIEW_DRAFT` · `PRODUCTION_CONFIGURATION_REQUIRED` · `COUNSEL_DECISION_REQUIRED`

Technical runtime activity and contractual publication readiness are tracked separately. A provider may be factually active from attributable Production evidence while its account owner/plan, legal entity, region, DPA applicability, retention and transfer treatment remain open. A factually active row is **not** by itself a counsel-approved subprocessor classification or a final contractual disclosure.

| Provider/service | Candidate purpose | Candidate data | Current status | Facts required before publication |
|---|---|---|---|---|
| Vercel | Hosting, deployment, edge delivery and logs | traffic, deployment and diagnostic metadata | Production deployment attributable; connected team plan is Pro; contractual/legal facts open | contracted entity/applicable agreement, processing regions where relevant, log retention, DPA and transfer terms |
| Supabase | Database, authentication, storage and RLS | accounts, organisations, workflow content and audit events | Production active in `eu-west-1`; connected organisation plan is Pro; standard DPA framework evidence exists; legal interpretation remains open | confirm whether any negotiated agreement supersedes standard terms; retention, transfer/subprocessor treatment and qualified legal interpretation |
| Stripe | Checkout, subscriptions, portal and payment processing | billing identifiers, subscription status and payment metadata | LIVE account identity and country `PT` proven; operator/entity alignment and account-specific contractual facts remain open | final operator/entity alignment, applicable DPA/agreement, enabled-service data categories, retention and transfer terms |
| Sentry | Error monitoring and diagnostics | error context and diagnostic metadata | Current Production release binding proven; organisation region/DPA acceptance facts remain open | organisation region, DPA acceptance actor/timestamp, legal entity, scrubbing/data categories, retention and transfer terms |
| PostHog | Product analytics | consented analytics events and identifiers | Production EU endpoint binding proven; connected assurance project does not match Production; Production account recovery and account facts remain open | identify/recover the actual Production project/account, confirm owner/plan/region/retention, obtain account-linked DPA evidence, transfer terms and final consent-policy legal approval |
| Upstash | Distributed rate limiting and security-abuse control state | operational request/control metadata and identifiers | Historical predecessor-release runtime binding proven; current exact-release runtime reproof and account/legal facts open | current exact-release runtime reproof; account owner/plan, region(s), retention/deletion, DPA applicability, transfer and subprocessor-notice terms |
| Email provider | Transactional and support email | email address, message metadata and content | Historical Resend use proven; current exact-release Production binding open | confirm current active provider/binding; if active, account/legal entity, region, DPA, retention, transfer terms and templates |
| Support provider | Customer support | contacts, tickets and attachments | Provider fact required | provider, region, access, DPA and retention |
| Malware/content scanner | Enterprise upload scanning when enabled | uploaded content and scan metadata | Current exact-release provider identity/binding not established | actual active provider, scope, region, retention, DPA and transfer terms if enabled |
| AI/model provider | Optional AI-assisted features or founder-operated external AI use | prompts, outputs and permitted customer content | Founder operational use outside direct SaaS runtime recorded; direct runtime integration not identified; counsel decision required | provider/workspace, legal role, region, retention, training policy, DPA and transfer terms; customer-content policy |

## Change process

**[COUNSEL DECISION REQUIRED]** Confirm general authorisation, advance notice period, objection grounds, material-change handling and customer remedies. Emergency replacements for security or service continuity should be documented and notified as soon as reasonably possible.

## Publication gate

Before this register becomes final or contractual:

1. reconcile the actual Production/operational provider configuration with attributable runtime/account evidence;
2. distinguish technically active providers from merely configured/candidate providers;
3. confirm legal entity, purpose, data categories, region/location and retention/deletion behavior;
4. record account-specific DPA/SCC/transfer and subprocessor-notice status where applicable;
5. obtain qualified privacy/legal counsel approval of role allocation and disclosure wording;
6. date and version the approved register and archive the version disclosed to each customer.

A candidate row is not evidence that a provider is active. Conversely, technical runtime evidence that a provider is active is not proof that its DPA, transfer mechanism or legal classification has been approved.
