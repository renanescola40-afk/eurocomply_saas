# Final security readiness CI reporting

## Context

`npm run security:final-readiness` is intentionally not promoted to a blocking CI gate yet. It is expected to fail until the repository has:

- a reviewed `package-lock.json`
- a generated `npm-audit.json`
- no remaining vulnerable packages in the audit JSON
- no floating dependency specs such as `latest`
- npm aligned with the pinned `packageManager`

## CI behavior

Security CI now runs the final readiness check as a non-blocking diagnostic step:

```bash
npm run security:final-readiness 2>&1 | tee -a final-security-readiness.md || true
```

The output is appended to the GitHub Actions Summary and included in the `npm-audit-triage` artifact alongside:

- `npm-audit.json`
- `npm-audit-summary.md`
- `final-security-readiness.md`

## Why this is non-blocking

The readiness command is the release/supply-chain finish-line check. Making it blocking before the lockfile and audit fixes exist would break every build without adding new protection.

Keeping it warning-only in CI gives reviewers a visible checklist of remaining blockers while allowing unrelated security gates, typecheck and tests to continue running.

## Promotion criteria

Promote `security:final-readiness` into `security:ci` only after:

1. `package-lock.json` is committed and reviewed.
2. Floating dependency specs are replaced with exact audited versions.
3. `npm-audit.json` is clean or exceptions are explicitly documented.
4. Security CI switches from `npm install --ignore-scripts` to `npm ci --ignore-scripts`.
