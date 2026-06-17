# P0 Runtime Gap Report Usage

Use the gap report to track the remaining runtime evidence items before release readiness.

## Command

```bash
node scripts/security/report-p0-runtime-evidence-gap.mjs
```

This prints a JSON summary of the three remaining runtime evidence items:

- `production-secrets-provider-stores.json`
- `supabase-live-rls-validation.json`
- `external-security-review-or-pentest.json`

## Strict mode

```bash
node scripts/security/report-p0-runtime-evidence-gap.mjs --strict
```

Strict mode exits with a non-zero status while any required runtime evidence remains incomplete.

Use strict mode on final evidence or release-ready branches.

## Score interpretation

The script reports only the remaining runtime evidence group. It does not replace the full P0 register or the runtime evidence validators.

A remaining runtime evidence item is considered satisfied when:

- the referenced runtime evidence file exists; and
- `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` marks that item as `Complete` or `Exception`.

`Exception` is only acceptable when the referenced runtime JSON carries the required approved-exception evidence enforced by the item-specific checker.

Current target for release-ready state:

- 3 of 3 remaining runtime evidence items satisfied
- all referenced runtime evidence files exist
- each remaining item is marked as `Complete` or `Exception` in the runtime register
