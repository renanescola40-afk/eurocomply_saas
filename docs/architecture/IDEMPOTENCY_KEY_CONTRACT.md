# Idempotency key compatibility contract

Idempotency keys are external operational identities. Once a key format is used for a side effect, its prefix, identity ordering, normalization, separator and digest length must be treated as a compatibility contract.

Current formats:

- Trial reminders: `trial-reminder:<48 lowercase hex>` using unit-separator-delimited normalized organization, subscription, period-end and recipient identity.
- Compliance notifications: `notification:<64 lowercase hex>` using colon-delimited normalized organization, event, entity type, entity, recipient and occurrence identity.

Rules:

1. Domain code must call a reviewed domain wrapper rather than the primitive directly.
2. Existing wrappers must preserve their golden compatibility tests.
3. A format change requires a versioned prefix and an explicit overlap/migration plan.
4. Raw customer identifiers, recipient addresses and secret values must not appear in emitted keys.
5. Idempotency keys reduce retry duplication; they do not prove exactly-once execution or replace completion-state persistence.
