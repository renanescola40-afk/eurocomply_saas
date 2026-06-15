# Phase 1 Execution Checklist

This checklist tracks the local foundation work needed before moving to CI/CD, deployment, and public production hardening.

## Automated by scripts

Run the full flow with:

```bash
node scripts/dev/run-phase1.mjs
```

The runner currently performs:

1. Pin known `latest` dependencies.
2. Generate `package-lock.json` without running lifecycle scripts.
3. Write dependency pin diagnostics.
4. Write Phase 1 status diagnostics.
5. Validate local foundation prerequisites.
6. Run TypeScript typecheck.
7. Run unit tests.
8. Run production build.
9. Write `phase1-run-report.json`.

## Expected generated files

These files are local diagnostics and should not be committed:

- `phase1-run-report.json`
- `phase1-status.json`
- `dependency-pin-report.json`
- `dependency-pin-change-report.json`
- `local-quality-report.json`
- `local-build-report.json`

These files should be committed after the runner succeeds:

- `package.json`, if dependency pins changed.
- `package-lock.json`, after it is generated.

## Completion criteria

Phase 1 is complete when all items below are true:

- `package-lock.json` exists and is committed.
- No dependencies use `latest`.
- `npm ci` succeeds from a clean checkout.
- `npm run typecheck` succeeds.
- `npm run test` succeeds.
- `npm run build` succeeds.
- Local diagnostic reports show success.

## Troubleshooting

If the runner fails, inspect:

```bash
cat phase1-run-report.json
```

Then fix the first failing step before continuing.
