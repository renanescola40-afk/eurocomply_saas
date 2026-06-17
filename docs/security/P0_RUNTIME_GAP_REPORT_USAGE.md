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

Current target for release-ready state:

- 3 of 3 remaining runtime evidence items complete
- all referenced runtime evidence files exist
- `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` marks each remaining item as `Complete`
