# Stripe Entitlement Runtime Threat Model

## Assets

- tenant billing identity;
- contracted entitlements;
- enterprise seat limits;
- webhook replay integrity;
- reconciliation evidence.

## Threats and controls

- **Forged event:** blocked by the existing Stripe signature verification boundary.
- **Oversized payload:** blocked before signature construction by bounded request reads.
- **Replay amplification:** controlled by Stripe event claims and snapshot idempotency keys.
- **Stale source metadata:** rejected by source-version optimistic concurrency.
- **Cross-tenant metadata:** constrained by UUID validation and tenant-scoped reconciliation.
- **Cancellation outage:** handled as an effective-dated downgrade rather than immediate destructive removal.
- **Payment failure lockout:** bounded grace periods avoid accidental instant suspension.
- **Lower-priority overwrite:** canonical source precedence rejects billing drift against stronger contract authority.
- **Abandoned processing lease:** recovered through compare-and-set transition before retry.

## Residual risks

- Stripe metadata may be absent or manually incorrect;
- webhook endpoint or secret may not be configured in production;
- production migrations may lag repository state;
- compromised Stripe or service-role credentials remain privileged incident scenarios.
