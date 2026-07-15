# Audit critical-coverage gate source boundary

Date: 2026-07-15
Status: Accepted
Priority: P1 release assurance

## Context

`scripts/security/check-audit-critical-coverage.mjs` verifies that critical security and business mutations retain named audit actions. Before this decision, the checker concatenated production source files, audit-model documentation, and a runtime-evidence JSON file into one string before looking for required action names.

That meant documentation could satisfy a required action token even if the corresponding production implementation was removed or renamed. The gate could therefore report success without proving that the named action remained present in executable application code.

This is a repository-side assurance gap only. It is not evidence that an audit event was missing in production, and it is not runtime validation.

## Decision

Separate inputs by purpose:

- required critical action names are checked only against executable application and server source files;
- evidence-family markers are checked only against the audit model and the existing runtime-evidence document;
- existing structural checks for the audit writer remain unchanged.

The change does not alter runtime code, persisted data, audit schemas, or event names.

## Impact

The security gate now fails when a required audit action exists only in documentation. This makes removal or accidental renaming of a critical production audit action visible during CI.

No migration, dependency, secret, RBAC, RLS, provider, public API, or customer-facing behavior changes.

## Risks and limitations

- The check remains static and token-based. It proves source presence, not runtime delivery, ordering, durability, or semantic correctness.
- A token elsewhere in the approved production source set can still satisfy the aggregate check. Per-operation AST or runtime assertions would be stronger but are outside this small change.
- Existing truthful runtime evidence keeps its current status and is not regenerated or upgraded by this change.

## Validation

Relevant repository check:

```sh
npm run security:audit-chain
```

The complete required CI suite must pass on the pull-request head before the change is considered ready.

## Rollback

Revert the commit that separates `criticalSourceFiles` from `auditEvidenceFiles`. No data rollback, migration rollback, or provider action is required.
