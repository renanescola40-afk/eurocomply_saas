# Subprocessor Register — Review Draft

**Status:** `REVIEW_DRAFT` · `PRODUCTION_CONFIGURATION_REQUIRED` · `COUNSEL_DECISION_REQUIRED`

Technical runtime activity, provider-account facts and contractual publication readiness are tracked separately. A factually active row is **not** by itself a counsel-approved subprocessor classification or a final contractual disclosure.

Current factual evidence authority: `docs/trust/evidence/2026-08-23-provider-account-and-runtime-reconciliation.md` and `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md`.

| Provider/service | Candidate purpose | Candidate data | Current status | Facts required before publication |
|---|---|---|---|---|
| Vercel | Hosting, deployment, edge delivery and logs | traffic, deployment and diagnostic metadata | Production active on exact current release; connected plan is Pro; prior Hobby observation superseded; contractual facts open | contracted entity, processing/transfer treatment, log retention/deletion and qualified legal approval |
| Supabase | Database, authentication, storage and RLS | accounts, organisations, workflow content and audit events | Production active in `eu-west-1`; connected organisation is Pro; DPA applicability automatically incorporated into Terms per provider confirmation; strict backup/HIBP proof and PITR remain separate; contractual facts open | strict managed-backup/HIBP evidence, PITR status if contractually required, retention/RPO/RTO, transfer treatment and qualified legal approval |
| Stripe | Checkout, subscriptions, portal and payment processing | billing identifiers, subscription status and payment metadata | LIVE Standard account country `PT` and business type `individual` proven; charges/payouts enabled; European standard contract/DPA path attributable; no genuine LIVE checkout/subscription lifecycle exists yet; contractual facts open | real customer lifecycle, enabled-service data categories, retention/deletion, transfer/subprocessor treatment and qualified legal approval |
| Sentry | Error monitoring and diagnostics | error context and diagnostic metadata | Production instrumentation and German/European ingestion region proven; privacy guardrails proven; account DPA acceptance still requires authorized Owner/Billing action; contractual facts open | DPA acceptance evidence, contracted entity, retention, transfer/subprocessor treatment and qualified legal approval |
| PostHog | Product analytics | consented analytics events and identifiers | Production targets EU service endpoints, but the connected assurance project is proven to be a different empty project; `CONNECTED_ASSURANCE_PROJECT_MISMATCH`; `ACCOUNT_FACTS_OPEN`; contractual facts open | identify/recover the actual Production project/account, plan, account region/settings, retention, DPA/account applicability, transfer terms and final consent-policy legal approval |
| Upstash | Distributed rate limiting and security-abuse control state | operational request/control metadata and identifiers | Production runtime binding proven; provider-standard DPA/transfer material captured; `ACCOUNT_LEGAL_FACTS_OPEN`; contractual facts open | exact account/plan, regions, retention/deletion specifics and qualified legal role/transfer treatment |
| Resend / email provider | Transactional and support email | email address, message metadata and content | Provider-standard DPA, primary-storage, transfer and deletion/backup mechanics captured; exact-main protected runtime-proof artifact, domain verification and real delivery availability remain open; contractual facts open | exact Production binding proof, active account/plan/entity, sender-domain verification, delivery availability and qualified legal treatment |
| Support provider | Customer support | contacts, tickets and attachments | Provider fact required; contractual facts open | provider, region, access model, DPA, retention and qualified legal treatment |
| Malware/content scanner | Enterprise upload scanning when enabled | uploaded content and scan metadata | Runtime contract requires provider-backed scanning when enabled; exact-main protected provider-proof artifact and account facts were not directly observed in the current reconciliation; contractual facts open | actual active provider/binding, scope, region, retention, DPA/transfer terms and qualified legal treatment |
| AI/model provider | Optional AI-assisted features or founder-operated external AI use | prompts, outputs and permitted customer content | Architecture/founder fact and counsel decision required; contractual facts open | provider/workspace, legal role, region, retention, training policy, DPA/transfer terms and customer-content policy |

## Current technical limitations that constrain commitments

- `compliance_metric_snapshots` exists in Production but remains partially incompatible with the V19 readiness contract; metric snapshot writes stay intentionally disabled/fail-closed and no Production DDL was executed in the reconciliation lane.
- Supabase PITR is not proven active and must not be promised or enabled merely for scoring.
- A genuine Stripe customer LIVE payment/subscription lifecycle is not present and must not be fabricated.
- Sentry DPA acceptance remains an authorized account action.
- The connected PostHog assurance project must not be represented as the Production account.
- Exact-main protected provider/recovery workflow results remain separate evidence artifacts from this account-fact reconciliation.

## Change process

**[COUNSEL DECISION REQUIRED]** Confirm general authorisation, advance notice period, objection grounds, material-change handling and customer remedies. Emergency replacements for security or service continuity should be documented and notified as soon as reasonably possible.

## Publication gate

Before this register becomes final or contractual:

1. reconcile actual Production/operational provider configuration with attributable runtime/account evidence;
2. distinguish technically active providers from merely configured/candidate providers;
3. confirm legal entity, purpose, data categories, region/location and retention/deletion behavior;
4. record DPA/account applicability or acceptance, transfer and subprocessor-notice status where applicable;
5. retain open technical boundaries instead of converting plan entitlement or provider-standard text into unsupported operational commitments;
6. obtain qualified privacy/legal counsel approval of role allocation and disclosure wording;
7. date/version the approved register and archive the version disclosed to each customer.

A candidate row is not evidence that a provider is active. Conversely, technical runtime or account evidence is not proof that its DPA, transfer mechanism or legal classification is counsel-approved.
