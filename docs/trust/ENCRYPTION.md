# Encryption

Status: encryption overview for enterprise security review. This document intentionally avoids claims that are not evidenced in the repository or provider configuration.

## Current model

EuroComply is designed to use provider-managed encryption and application-layer integrity controls rather than customer-managed encryption keys or browser-to-browser end-to-end encryption.

| Area | Current customer-safe position | Evidence / owner |
| --- | --- | --- |
| Data in transit | HTTPS/TLS is expected for hosted Next.js, Supabase, Stripe, and other provider endpoints in production. | Hosting/provider configuration evidence required before release. |
| Database at rest | Supabase-managed Postgres encryption is expected according to provider configuration. | Confirm in Supabase project evidence. |
| Object storage at rest | Supabase-managed storage encryption is expected according to provider configuration. | Confirm storage bucket settings and provider documentation. |
| Payment data | Raw card data is handled by Stripe, not by EuroComply application code. | Stripe configuration and webhook evidence. |
| Audit integrity | Audit events can include SHA-256 event hashes and optional HMAC signatures. | `src/server/security/audit-chain.ts` |
| Upload integrity | Document workflows may use checksums and validation controls where implemented. | Upload and document-security evidence. |

## What is not currently claimed

EuroComply must not claim browser-level end-to-end encryption, customer-managed keys, bring-your-own-key, hardware security module-backed application encryption, or externally immutable/WORM audit storage unless those controls are implemented and evidence is attached.

## Secrets

Application secrets must be stored in the hosting provider's secret store. The repository should not contain production secrets. Server-side secrets include `SUPABASE_SERVICE_ROLE_KEY`, `AUDIT_CHAIN_SIGNING_SECRET`, `EVIDENCE_PACK_SIGNING_SECRET`, Stripe webhook secrets, healthcheck tokens, cron secrets, and provider API keys.

## Audit-chain signing

When `AUDIT_CHAIN_SIGNING_SECRET` is configured, audit event hashes can be signed with HMAC-SHA-256. Without the secret, the chain can still hash events but signatures are omitted. This is an integrity control, not encryption and not WORM storage.

## Customer-safe answer

Use: "EuroComply is designed to use TLS for data in transit, provider-managed encryption at rest for managed infrastructure, Stripe-hosted payment processing, and SHA-256/HMAC audit integrity controls where configured. The product does not currently offer end-to-end encryption or customer-managed keys."
