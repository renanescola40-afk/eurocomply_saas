# Subprocessors register

Status: enterprise review draft. Verify before sharing with customers or incorporating into a DPA.

## Purpose

This register lists providers that may process customer data or operational metadata for EuroComply. Keep it current before signing a customer agreement or answering a buyer questionnaire.

## Current draft list

| Provider | Service category | Data category | Status |
| --- | --- | --- | --- |
| Vercel | Application hosting and deployment | Application traffic, deployment metadata, logs | Needs review |
| Supabase | Database, authentication and storage if enabled | Customer data, organization data, documents, auth metadata | Needs review |
| Stripe | Billing and subscription management | Billing metadata; payment details handled by Stripe | Needs review |
| Upstash | Redis, rate limiting or cache if enabled | Operational metadata | Conditional |
| GitHub | Source code and CI/CD | Source code, workflow logs, security artifacts | Needs review |

## Maintenance

Review providers before each enterprise contract, confirm provider terms and region, update this register before disclosure, and keep an archived copy for each signed customer DPA version.

## Guardrail

Do not claim a complete subprocessor program until provider terms, regions and customer notice procedures are verified.