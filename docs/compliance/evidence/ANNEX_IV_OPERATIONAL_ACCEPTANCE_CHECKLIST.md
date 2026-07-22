# Annex IV Operational Acceptance Checklist

## Product workflow

- [x] Customer-facing workspace exists.
- [x] Versioned package creation exists.
- [x] Twelve sections are created atomically.
- [x] Section authoring and independent review are supported.
- [x] Evidence can be submitted per section.
- [x] Package approval is fail-closed.
- [x] Approval appends an immutable decision.

## Security

- [x] Authentication and active organization are required.
- [x] Reads require `read_ai_governance`.
- [x] Writes require `manage_ai_governance`.
- [x] Trusted Origin protects browser mutations.
- [x] Zod and body-size limits protect inputs.
- [x] Distributed rate limiting fails closed.
- [x] Evidence references are organization scoped.
- [x] Responses are no-store and errors are sanitized.

## Transaction integrity

- [x] Package version allocation uses an advisory lock.
- [x] Package and twelve sections are created in one transaction.
- [x] Evidence counts are derived by database triggers.
- [x] Package completion is derived from section rows.
- [x] Approval uses optimistic concurrency and row locking.
- [x] Approval and decision append occur atomically.
- [x] RPC execution is restricted to `service_role`.

## Release evidence still required

- [ ] Exact-head lint, typecheck, tests and build pass.
- [ ] API route inventory and BOLA classification pass.
- [ ] Migration succeeds in an isolated database.
- [ ] Positive and negative two-organization RLS proof passes.
- [ ] Forced audit-outage behaviour is verified.
- [ ] Accessibility and responsive review pass.
- [ ] Translation review passes.
- [ ] Qualified engineering methodology review is accepted.
- [ ] Qualified legal applicability review is accepted.
- [ ] Exact-SHA product coverage artifact is retained.

This checklist measures workflow and evidence readiness only. It does not certify the technical documentation, authorize CE marking or represent regulator approval.
