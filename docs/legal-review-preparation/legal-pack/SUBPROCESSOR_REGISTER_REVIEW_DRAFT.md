# Subprocessor Register — Review Draft

**Status:** `REVIEW_DRAFT` · `PRODUCTION_CONFIGURATION_REQUIRED` · `COUNSEL_DECISION_REQUIRED`

A provider is listed as active only after production configuration, legal entity, region, DPA and transfer mechanism are confirmed.

| Provider/service | Candidate purpose | Candidate data | Current status | Facts required before publication |
|---|---|---|---|---|
| Vercel | Hosting, deployment, edge delivery and logs | traffic, deployment and diagnostic metadata | Configuration confirmation required | contracted entity, project regions, log retention, DPA and transfer terms |
| Supabase | Database, authentication, storage and RLS | accounts, organisations, workflow content and audit events | Core candidate; facts required | contracted entity, project region, backups, retention, DPA and transfer terms |
| Stripe | Checkout, subscriptions, portal and payment processing | billing identifiers, subscription status and payment metadata | Billing-dependent | contracted entity, merchant setup, region/transfer terms, DPA and retention |
| Sentry | Error monitoring and diagnostics | error context and diagnostic metadata | Optional/configuration required | project region, scrubbing, retention, DPA and transfer terms |
| PostHog | Product analytics | consented analytics events and identifiers | Optional/configuration required | EU project status, consent mode, retention, DPA and transfer terms |
| Email provider | Transactional and support email | email address, message metadata and content | Provider fact required | provider, region, DPA, retention and templates |
| Support provider | Customer support | contacts, tickets and attachments | Provider fact required | provider, region, access, DPA and retention |
| AI/model provider | Optional AI-assisted features | prompts, outputs and permitted customer content | Architecture/founder fact required | provider, model, region, retention, training policy, DPA and transfer terms |

## Change process

**[COUNSEL DECISION REQUIRED]** Confirm general authorisation, advance notice period, objection grounds, material-change handling and customer remedies. Emergency replacements for security or service continuity should be documented and notified as soon as reasonably possible.

## Publication gate

Before this register becomes public or contractual:

1. export the actual production provider configuration;
2. reconcile it with environment variables, invoices and provider contracts;
3. confirm legal entity, purpose, data, region and transfer mechanism;
4. record DPA/SCC status and retention/deletion terms;
5. obtain privacy counsel approval;
6. date and version the register.

A candidate row is not evidence that a provider is active.
