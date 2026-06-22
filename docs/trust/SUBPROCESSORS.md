# Subprocessors register

Status: draft operational register. This file must be reviewed against actual production configuration, provider DPAs, regions, and customer contract language before being shared as a final customer schedule.

## Purpose

This register lists third-party providers that may process customer data, customer metadata, operational metadata, source code, logs, billing metadata, or security evidence while operating EuroComply. The list is intentionally conservative: conditional providers must be removed or marked not applicable if they are not enabled for a customer environment.

## Current draft list

| Provider | Service category | Data category | Region / hosting notes | Current status |
| --- | --- | --- | --- | --- |
| Vercel | Application hosting, deployment, edge/network routing | Application traffic, deployment metadata, logs, environment metadata | Confirm project region, log retention, and enterprise settings | Expected / needs review |
| Supabase | Authentication, Postgres database, storage | Account data, organization data, customer workspace data, document metadata, documents if storage enabled, auth metadata | Confirm project region, backup settings, RLS evidence, storage bucket privacy | Expected / needs review |
| Stripe | Billing and subscription management | Billing metadata, customer billing identifiers, payment method data handled by Stripe | Confirm account region, webhook configuration, DPA | Expected if paid plans enabled |
| GitHub | Source code, CI/CD, release evidence | Source code, workflow logs, security artifacts, issue/PR metadata | Confirm access controls and workflow log retention | Expected / needs review |
| Sentry | Error monitoring and diagnostics | Error events, stack traces, runtime metadata, redacted request context if configured | Include only if enabled in production; confirm scrubbing and region | Conditional |
| Upstash | Redis, rate limiting, cache, queue-like operational metadata | Rate-limit keys, cache keys, operational metadata | Include only if enabled; confirm region and retention | Conditional |
| Resend or email provider | Transactional email | Recipient email, message metadata, notification content | Include only if enabled; confirm DPA and region | Conditional |

## Customer notice policy draft

Customers should receive notice before adding a material subprocessor that processes customer personal data. The final notice period, objection process, and emergency replacement language must be approved by legal counsel and reflected in the signed DPA.

## Maintenance procedure

1. Review this register before each enterprise contract or security questionnaire.
2. Confirm which providers are actually enabled in the target environment.
3. Confirm provider DPA, security documentation, region, and retention posture.
4. Confirm data categories and whether customer personal data is processed.
5. Update the public Trust Center and procurement packet before customer disclosure.
6. Archive the version disclosed to each customer with the related DPA version.

## Customer-safe answer

"EuroComply maintains a subprocessor register for infrastructure, authentication/database/storage, billing, source control/CI, and conditional observability/cache/email providers. The register is reviewed before enterprise disclosure and final contractual commitments depend on the signed DPA and enabled production services."

## Do not claim

Do not claim a complete subprocessor program, EU-only processing, no subprocessors, or fixed provider regions until provider usage, DPAs, regions, and customer notice procedures are verified for the target customer environment.
