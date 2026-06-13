# Final Security Execution Runbook

Date: 2026-06-13
Status: execution-ready, waiting for real npm/GitHub Actions output

## Purpose

This runbook turns the remaining supply-chain closure work into a deterministic execution sequence.

Use it when a runner or developer machine has network access to npm and can generate a real `package-lock.json` and `npm-audit.json`.

## Preconditions

1. Work from the latest `main` branch.
2. Confirm the npm runtime matches `package.json` `packageManager`.
3. Do not use `npm audit fix --force`.
4. Do not commit `npm-audit.json` or other raw audit artifacts.
5. Use exact versions when replacing floating dependency specs.

## Execution sequence

```bash
npm --version
npm run security:supply-chain
npm run supply-chain:lockfile
npm run security:npm-audit:json > npm-audit.json
npm run security:npm-audit:summary
npm run supply-chain:floating-deps
npm run security:final-readiness:report
```

Expected intermediate state before fixes:

- `package-lock.json` should now exist locally.
- `npm-audit.json` should exist locally but stay uncommitted.
- `final-security-readiness.json` should exist locally but stay uncommitted unless a future policy explicitly allows it.
- `security:final-readiness` may still fail until vulnerabilities and floating specs are resolved.

## GitHub Actions manual triage run

The Security CI workflow supports `workflow_dispatch`, so the final audit/readiness artifact can be generated on demand without waiting for a new push or Vercel deployment.

Use this after committing dependency and lockfile remediation:

1. Open **Actions** in GitHub.
2. Select **EuroComply Security CI**.
3. Choose **Run workflow** on `main`.
4. Download the `npm-audit-triage` artifact from the completed run.
5. Review `npm-audit-summary.md`, `final-security-readiness.md`, and `final-security-readiness.json`.

This is especially useful while Vercel is blocked by `upgradeToPro=build-rate-limit`.

## Targeted remediation sequence

1. Review `npm-audit.json` and `npm run security:npm-audit:summary` output.
2. Identify whether the high/moderate advisories affect production dependencies.
3. Update only the packages required by the advisory path.
4. Prefer exact versions resolved in the generated lockfile.
5. Replace current floating specs with audited exact versions:
   - `@emotion/is-prop-valid`
   - `framer-motion`
   - `vaul`
6. Re-run:

```bash
npm run security:npm-audit:json > npm-audit.json
npm run security:npm-audit:summary
npm run supply-chain:floating-deps
npm run security:final-readiness
npm run security:ci
```

## Commit requirements

Commit only:

- `package.json` dependency spec changes
- `package-lock.json`
- documentation or gate updates required by the remediation

Do not commit:

- `npm-audit.json`
- `final-security-readiness.json`
- `npm-audit-summary.md`
- GitHub Actions downloaded artifacts

## Promotion criteria

After `npm run security:final-readiness` passes and CI validates the lockfile:

1. Replace CI install with `npm ci --ignore-scripts` where appropriate.
2. Promote missing lockfile from warning to failure.
3. Promote floating dependency specs from warning to failure.
4. Consider promoting production npm audit into `security:ci`.
5. Keep `security:final-readiness:report` as the machine-readable readiness artifact.

## Rollback plan

If dependency remediation breaks build or tests:

1. Revert only the dependency/lockfile commit.
2. Keep the runbook and security gates.
3. Re-run audit summary and try a narrower package update.
4. Document any accepted advisory exception before merging.
