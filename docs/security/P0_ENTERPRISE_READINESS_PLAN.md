# P0 Enterprise Readiness Plan

This document tracks the blockers that must be resolved before EuroComply can be treated as enterprise-production ready.

The goal is not to claim a military or vendor certification. The goal is to remove the critical gaps that would block serious enterprise security review, procurement, or public production rollout.

## P0 blockers

### 1. Commit a deterministic npm lockfile

Required outcome:

- `package-lock.json` exists in source control.
- The lockfile is generated with `npm@10.8.2`.
- Installation uses deterministic dependency resolution.
- Lockfile changes are reviewed like code.

Validation:

```bash
npm run supply-chain:lockfile
node scripts/security/plan-dependency-pins-from-lockfile.mjs
node scripts/security/apply-dependency-pins-from-lockfile.mjs
npm run supply-chain:floating-deps
npm run security:npm-audit:json > npm-audit.json
npm run security:npm-audit:summary
```

Artifact workflow:

```text
P0 Lockfile Plan
```

The workflow generates reviewable artifacts without committing them automatically:

- `package-lock.json`
- `package.pinned.json`
- `dependency-pin-plan.json`
- `dependency-pin-change-report.json`
- `floating-dependencies.txt`
- `npm-audit.json`
- `p0-lockfile-artifacts.sha256`

Reviewers must compare `package.pinned.json` with the current `package.json`, review audit output, and verify checksums before committing the lockfile and pinned manifest.

Gate:

```bash
node scripts/security/check-lockfile-required.mjs
```

### 2. Remove floating dependency specs

Required outcome:

- No dependency uses `latest`.
- No dependency uses `*`.
- No dependency uses broad `x` ranges.
- No dependency uses unresolved open-ended ranges.
- Replacements use exact audited versions from the generated lockfile.

Safe planning command:

```bash
node scripts/security/plan-dependency-pins-from-lockfile.mjs
```

Safe application command:

```bash
node scripts/security/apply-dependency-pins-from-lockfile.mjs
```

These commands must only use versions that are already resolved in `package-lock.json`. Do not replace floating specs with guessed versions.

Gate:

```bash
node scripts/security/list-floating-dependencies.mjs
```

### 3. Apply branch protection on `main`

Required outcome:

- Pull requests are required before merge.
- CODEOWNERS review is required.
- Required status checks are enforced.
- Force pushes are blocked.
- Branch deletion is blocked.
- Conversations must be resolved.
- Production deployment requires approval.

Required status checks:

- `Full Security Suite / Run expanded security gates`
- `Semgrep / Run Semgrep SAST`
- `Gitleaks / Scan repository for accidental secret exposure`
- `Actionlint / Lint GitHub Actions workflows`
- `OSSF Scorecard / Run OSSF Scorecard`
- `CodeQL`
- `Dependency Review`

Reference:

```text
docs/security/CI_CD_BRANCH_PROTECTION.md
```

### 4. Configure production secrets in provider secret stores

Required outcome:

- Production secrets are configured in Vercel, Supabase, GitHub Environments, or the target provider secret store.
- Secret values are not committed.
- Release evidence is redacted.
- Audit-chain and Evidence Pack signing secrets are configured before external evidence sharing.

Gates:

```bash
node scripts/security/check-env-example-policy.mjs
node scripts/security/check-release-environment-evidence.mjs
```

### 5. Validate Supabase RLS live

Required outcome:

- Live RLS validation runs against the target Supabase project.
- Cross-tenant reads fail.
- Cross-tenant writes fail.
- Service-role paths are reviewed separately from user-session paths.
- Evidence is attached to release approval.

Reference:

```text
docs/RELEASE_EVIDENCE_CHECKLIST.md
```

### 6. Require external security review before enterprise/public release

Required outcome:

- External security review or pentest completed.
- Critical findings resolved.
- High findings resolved or formally accepted.
- Retest evidence attached where applicable.

Reference:

```text
docs/RELEASE_EVIDENCE_CHECKLIST.md
```

## Current expected state

The Full Security Suite is expected to fail until the lockfile exists and floating dependency specs are replaced with exact audited versions.

This is intentional. P0 gates must fail closed.

## Release rule

EuroComply must not be promoted to public production or enterprise procurement until all P0 blockers are closed or explicitly documented as private-beta exceptions by the release owner.
