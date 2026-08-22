# Subprocessor Register — Review Draft

**Status:** `REVIEW_DRAFT` · `PRODUCTION_CONFIGURATION_REQUIRED` · `COUNSEL_DECISION_REQUIRED`

Technical runtime activity and contractual publication readiness are tracked separately. A provider may be factually active from attributable Production evidence while its account owner/plan, legal entity, region, DPA applicability, retention and transfer treatment remain open. A factually active row is **not** by itself a counsel-approved subprocessor classification or a final contractual disclosure.

| Provider/service | Candidate purpose | Candidate data | Current status | Facts required before publication |
|---|---|---|---|---|
| Vercel | Hosting, deployment, edge delivery and logs | traffic, deployment and diagnostic metadata | Production active; current connected plan is Hobby; contractual facts open | applicable commercial plan/agreement, contracted entity, project/processing regions, log retention, DPA and transfer terms |
| Supabase | Database, authentication, storage and RLS | accounts, organisations, workflow content and audit events | Production active in `eu-west-1`; current connected organisation is Free; resilience/legal facts open | contracted entity, DPA applicability, backups/PITR entitlement, retention, transfer and subprocessor terms |
| Stripe | Checkout, subscriptions, portal and payment processing | billing identifiers, subscription status and payment metadata | LIVE account identity proven; account-country/entity facts open | account country, contracted entity, applicable DPA, enabled-service data, retention and transfer terms |
| Sentry | Error monitoring and diagnostics | error context and diagnostic metadata | Production instrumentation proven; contractual/account-region facts open | organisation region, legal entity, scrubbing/data categories, retention, DPA and transfer terms |
| PostHog | Product analytics | consented analytics events and identifiers | Production binding present; connected assurance project mismatch; account facts open | identify/recover the actual Production project/account, region, retention, DPA, transfer terms and final consent-policy legal approval |
| Upstash | Distributed rate limiting and security-abuse control state | operational request/control metadata and identifiers | Production runtime active; contractual facts open | account owner/plan, region(s), retention/deletion, DPA applicability, transfer and subprocessor-notice terms |
| Email provider | Transactional and support email | email address, message metadata and content | Provider fact required; current Resend Production binding not proven | active provider/account, region, DPA, retention, transfer terms and templates |
| Support provider | Customer support | contacts, tickets and attachments | Provider fact required | provider, region, access, DPA and retention |
| Malware/content scanner | Enterprise upload scanning when enabled | uploaded content and scan metadata | Runtime/provider identity fact required | actual active provider, scope, region, retention, DPA and transfer terms |
| AI/model provider | Optional AI-assisted features or founder-operated external AI use | prompts, outputs and permitted customer content | Architecture/founder fact and counsel decision required | provider/workspace, legal role, region, retention, training policy, DPA and transfer terms; customer-content policy |

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
