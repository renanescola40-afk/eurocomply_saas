# RISCK COMPLY provider current-state overlay — 2026-09-09

Status: factual current-state overlay for procurement review. This file supersedes stale release-specific facts in the 2026-08-24 provider register where the two conflict. It is not a DPA, legal opinion, certification, independent pentest, regulator approval, or final Enterprise acceptance.

## Current protected source

- protected `main`: `6f99280779930c60fca6c65350fda0636c664292`
- current public Production remains on an older Vercel deployment/SHA and therefore is **not exact-current-main**
- release-specific claims remain `OPEN` until a governed exact-SHA Production path and retained evidence complete

## Supabase Production

Read-only connected evidence on 2026-09-09:

- Production project: `tganhbbhfxcpblmgqprg`
- migration ledger count: `90`
- migration head: `20260909006900`
- canonical V41 selected inventory: `13/13` present live
- `organization_members.status`: present
- `app_private.has_commercial_authority(uuid)`: present
- reviewed commercial/payment-first policy surface is present
- RLS and FORCE RLS are enabled on `organization_members`, `ai_systems`, `documents`, `risks`, `subscriptions`, and `tasks`

Boundary: the live schema effect is present, but V41 governed promotion provenance remains an evidence issue. Do not reapply, repair, roll back, or issue ad-hoc DDL to manufacture provenance.

## Stripe LIVE

- canonical LIVE account: `acct_1U6IuJGt3cgjPOtq` / RISCK COMPLY SAAS
- provider control plane is LIVE
- public self-serve initial paid Checkout is fail-closed by release policy until paid-GA acceptance
- current database contains three processed `livemode=true` platform-proof Checkout events; they are non-crediting because they lack the exact organization/customer/subscription correlation required for commercial authority
- legitimate LIVE subscription authority observed under the source contract: `0`
- the one historically persisted Stripe-bound subscription ID was not found in the canonical LIVE Stripe account during read-only reconciliation

Boundary: do not describe fixtures, seeded rows, or platform-proof events as paying customers.

## Vercel Production

- canonical public site is serving and `/api/health` returned HTTP 200 in fresh read-only validation
- anonymous `/api/ready` returns HTTP 401 fail-closed
- canonical deployment observed on 2026-09-09: `dpl_GrWRgzmMnUfBattRgeBX4j3ic8LT`, Git SHA `8a30ca3e6d06a77a83d7f2d10f7cef7edfe040a6`
- this is stale relative to protected `main@6f99280779930c60fca6c65350fda0636c664292`
- exact-main Enterprise Production Gate has passed quality/security/build, production-like E2E, and Production-environment governance; protected Production runtime validation remains a separate gate

Boundary: current availability does not equal exact-SHA release acceptance.

## External assurance and legal

- EC AI Act Service Desk official implementation guidance: received and retained; non-binding and not legal approval
- qualified legal workstreams accepted: `0/8`
- independent pentest: application submitted to 7ASecurity; selection/testing not yet completed
- retest: not started
- Portuguese VAT treatment for the selling entity: attributable fact remains open

## Buyer-safe disclosure rule

For procurement or buyer disclosures, use this overlay together with the permanent trust/control documents. Do not use stale release-specific rows from the 2026-08-24 provider register as current facts when they conflict with this overlay. Do not claim full Enterprise acceptance, qualified legal approval, completed independent pentest, valid paying-customer lifecycle, or final VAT treatment until attributable evidence exists.
