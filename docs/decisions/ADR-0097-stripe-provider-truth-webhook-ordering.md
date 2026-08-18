# ADR-0097 — Stripe provider truth for out-of-order subscription webhooks

- Status: Accepted
- Date: 2026-08-18
- Owners: Billing Engineering / Application Security / Revenue Protection

## Context

Stripe webhook delivery order is not a commercial-authority guarantee. A signed and valid subscription event can be delivered after a newer lifecycle event. RISCK COMPLY previously claimed each event durably, but `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted` then wrote the subscription object carried by that individual event directly into the local `subscriptions` row.

That means a delayed older `active` update could be processed after a newer cancellation and attempt to restore an active local row. The canonical product license correctly requires an active/trialing row plus processed live Stripe evidence, so allowing stale delivery to rewrite that row is a revenue-protection risk. The enterprise entitlement path had the same ordering concern because it normalized subscription metadata/status directly from the delivered event object.

## Decision

1. Keep the original signed Stripe event as the durable event-ledger payload and idempotency identity.
2. After the event is claimed, live subscription lifecycle events retrieve the same subscription ID from Stripe.
3. Local subscription status, plan, period and customer binding are written from this provider-current subscription object rather than from arrival order.
4. Enterprise entitlement reconciliation builds a decision-only copy of the event that preserves event ID, event type, creation time and livemode while replacing `data.object` with provider-current subscription state.
5. Provider-current `status=canceled` terminates entitlement access even when the delivered event type was an older `customer.subscription.updated` or `customer.subscription.created`.
6. Provider lookup failure or subscription-ID mismatch fails closed. The claimed event is marked failed by the existing webhook processor and Stripe can retry it.
7. Test-mode events remain deterministic and do not perform the extra provider lookup because RISCK COMPLY's commercial authority explicitly requires `livemode=true`; test-mode event rows can never grant paid production access.
8. Invoice lifecycle events continue using the existing provider-truth subscription refresh path before their event-specific side effects.

## Security and revenue invariants

- Webhook arrival order never overrides current live Stripe subscription state.
- A stale `active` event cannot re-license an already canceled subscription.
- A stale higher-plan event cannot overwrite provider-current plan/status when a live lifecycle event is processed.
- Raw signed event evidence remains retained in `stripe_events_processed.payload`.
- Provider-current decision state does not replace or fabricate the signed event record.
- `active` and `trialing` remain the only local self-serve statuses eligible for canonical product licensing.
- `past_due`, `unpaid`, `incomplete` and `canceled` do not become paid product authority through this change.
- Cancel-at-period-end remains active while Stripe reports the subscription active; termination occurs when provider-current status becomes canceled / the deletion lifecycle is reached.

## Consequences

### Positive

- Subscription state becomes resilient to Stripe webhook delivery reordering.
- Revenue protection no longer depends on which valid lifecycle payload happened to arrive last.
- Entitlement termination follows provider-current cancellation state.
- Existing event deduplication, processing leases, retry recovery, signature validation and raw evidence retention remain intact.

### Trade-offs

- Each live subscription lifecycle event adds a Stripe subscription retrieval before applying local billing state and another provider-current read when the enterprise entitlement lane reconciles the same event. Correctness is preferred over stale authorization. A future optimization may safely share request-scoped provider truth if it preserves fail-closed semantics and raw ledger evidence.
- Test-mode webhook processing does not make this extra provider request because test-mode rows are not eligible for production commercial authority.

## Validation

Regression coverage proves:

- live lifecycle events retrieve the subscription by the exact signed subscription ID;
- provider ID mismatch fails closed;
- test-mode events never become live commercial authority;
- event identity/time are preserved while decision state is replaced;
- provider-current canceled state zeros enterprise seats even for an `updated` event;
- raw event payload is claimed before event processing;
- provider truth is applied before local subscription upsert;
- canonical licensing still requires an active/trialing local row plus processed live Stripe authority.

## Rollback

Revert the commits from the Mega PR that add `stripe-subscription-provider-truth.ts`, provider-current subscription processing, provider-current entitlement normalization and the associated tests/ADR. No database migration, Stripe object mutation, Supabase schema change, secret rotation or provider configuration change is required. Rollback would restore dependence on webhook delivery order and therefore reopens a commercial authorization risk; use only as an emergency availability measure while paid product access is otherwise restricted.
