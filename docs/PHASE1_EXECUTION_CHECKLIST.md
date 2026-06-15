# Phase 1 Execution Checklist

This checklist tracks the local foundation work needed before moving to CI/CD, deployment, and public production hardening.

## One-command flow

Run the full Phase 1 flow with:

```bash
node scripts/dev/run-phase1.mjs
```

The runner clears stale local reports first, then performs the current flow:

1. Validate `.gitignore` hygiene for local reports.
2. Validate Node.js runtime compatibility.
3. Validate the declared package manager version.
4. Pin known `latest` dependencies.
5. Validate build prerequisites.
6. Generate `package-lock.json` without running lifecycle scripts.
7. Validate that `package-lock.json` exists and is not ignored by Git.
8. Write dependency pin diagnostics.
9. Write Phase 1 status diagnostics.
10. Validate local foundation prerequisites.
11. Run TypeScript typecheck.
12. Run unit tests.
13. Run production build.
14. Write the Phase 1 commit plan.
15. Validate the Phase 1 commit plan.
16. Always write the final text report after the run summary is generated.

## Expected generated files

These files are local diagnostics and should not be committed:

- `phase1-run-report.json`
- `phase1-summary.json`
- `phase1-commit-plan.json`
- `phase1-final-report.txt`
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
- `package-lock.json` is not ignored by Git.
- No dependencies use `latest`.
- Node.js runtime is compatible.
- The active npm major version matches `packageManager`.
- `npm ci` succeeds from a clean checkout.
- `npm run typecheck` succeeds.
- `npm run test` succeeds.
- `npm run build` succeeds.
- `phase1-commit-plan.json` reports `readyToCommit: true`.

## Troubleshooting

If the runner fails, inspect the concise final report first:

```bash
cat phase1-final-report.txt
```

If more detail is needed, inspect:

```bash
cat phase1-summary.json
cat phase1-run-report.json
```

Then fix the first failing step before continuing.
