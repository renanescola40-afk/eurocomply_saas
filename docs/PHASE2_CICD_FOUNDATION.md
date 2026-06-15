# Phase 2 CI/CD Foundation Checklist

This checklist starts the CI/CD foundation phase after the local foundation has been prepared.

## Goal

Prove that the project can be validated automatically in a clean CI environment before production deployment work continues.

## Required CI workflow

The repository should provide a GitHub Actions workflow that runs on pull requests and pushes to the main branch.

The minimum required checks are:

- Install dependencies from `package-lock.json` using `npm ci`.
- Run `npm run typecheck`.
- Run `npm run test`.
- Run `npm run build`.

## Recommended workflow file

```txt
.github/workflows/ci.yml
```

## Required local validation

Before marking Phase 2 as ready, run:

```bash
node scripts/dev/check-phase2-cicd-foundation.mjs
```

After aliases are added, the preferred command will be:

```bash
npm run phase2:check
```

## Completion criteria

Phase 2 CI/CD foundation is complete when:

- `.github/workflows/ci.yml` exists.
- The CI workflow runs on pull requests.
- The CI workflow runs on pushes to the main branch.
- The CI workflow uses `npm ci`.
- The CI workflow runs typecheck, tests, and build.
- The local Phase 2 CI/CD checker passes.
- A first CI run completes successfully in GitHub Actions.

## Expected gaps before implementation

Before the CI workflow is added, the Phase 2 checker is expected to flag:

- Missing `.github/workflows/ci.yml`.
- Missing CI trigger coverage.
- Missing dependency installation step.
- Missing quality gates.

## Exit criteria

Phase 2 can be marked complete only after the workflow file is committed and a real GitHub Actions run passes.
