# Subprocessors register

Status: draft. This file must be reviewed before being shared with customers.

## Purpose

This register lists third-party providers that may process customer data or operational metadata for EuroComply. Keep it current before signing a DPA or answering security questionnaires.

## Current draft list

| Provider | Service category | Data category | Region / hosting notes | Status |
| --- | --- | --- | --- | --- |
| Vercel | Application hosting and deployment | Application traffic, deployment metadata, logs | Confirm project region and data residency settings | Needs review |
| Supabase | Database, auth/storage if enabled | Customer data, organization data, documents, auth metadata | Confirm project region, backups, RLS evidence | Needs review |
| Stripe | Billing and subscription management | Billing metadata, customer billing details handled by Stripe | Confirm account region and DPA | Needs review |
| Upstash | Redis/rate limiting/cache if enabled | Rate-limit keys, operational metadata | Confirm enabled usage and region | Conditional |
| GitHub | Source code and CI/CD | Source code, workflow logs, security artifacts | Confirm repository access controls | Needs review |

## Customer notice policy draft

Customers should receive notice before adding a material subprocessor that processes customer personal data. The final notice period must be agreed with legal counsel.

## Maintenance procedure

1. Review subprocessors before each enterprise contract.
2. Confirm provider DPA and security documentation.
3. Confirm data categories and region.
4. Update this register before customer disclosure.
5. Keep an archived copy for each signed customer DPA version.

## Do not claim

Do not claim a complete subprocessor program until provider DPAs, regions, and customer notice procedures are verified.
