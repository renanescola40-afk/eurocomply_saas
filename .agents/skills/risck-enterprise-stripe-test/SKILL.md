---
name: risck-enterprise-stripe-test
description: Produce BIL-02/BIL-03 signed real Stripe TEST webhook, replay and persisted QA Checkout evidence.
---
# Stripe TEST billing specialist

Read current BIL PRs, existing webhook/ledger/reconciliation tests and official Stripe docs; do not install deprecated agent-toolkit packages or add a new payment authority.

For BIL-02 require a real Stripe TEST signed event, rejection of invalid signatures, recorded event/delivery ID, idempotent duplicate replay and durable QA ledger readback. Intake writer must not set processed or grant entitlements. For BIL-03 require a real TEST Checkout bound to a QA tenant, persisted subscription/entitlement and authenticated access verification; respect DAT-01 dependencies.

Source-only contracts, mocked signatures, rollback-only SQL and PR merge never prove Stripe provider end to end. No Stripe LIVE changes, paid purchases, Production writes, emails, tokens in messages, or fabricated payment records. If signed delivery or QA identity is missing, STOP with exact blocker/provider link.
