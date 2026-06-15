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
node scripts/dev/run-phase2-finalize.mjs
```

After aliases are added, the preferred command is:

```bash
npm run phase2:finalize
```

For the complete local validation before the final commit-plan check, run:

```bash
npm run phase2:complete
```

For the stricter CI/CD workflow validation without the full local-report wrapper, run:

```bash
npm run phase2:strict
```

For only the CI/CD workflow check, run:

```bash
npm run phase2:check
```

To patch only the Phase 2 generated-report entries in `.gitignore`, run:

```bash
npm run phase2:gitignore
```

The workflow patcher is:

```txt
ensure-phase2-ci-workflow
```

The complete runner validates file inventory, documentation, generated report hygiene, package aliases, CI/CD workflow requirements, and writes the final Phase 2 report.

The finalizer runs the complete runner and then validates the commit plan.

## Local diagnostic outputs

The Phase 2 checker writes local diagnostics that should not be committed:

- `phase2-cicd-report.json`
- `phase2-final-report.txt`
- `phase2-commit-plan.json`

## Phase 2 script inventory

The core scripts are:

- `check-phase2-script-files`
- `ensure-phase2-gitignore`
- `check-phase2-gitignore`
- `check-phase2-package-scripts`
- `check-phase2-cicd-foundation`
- `write-phase2-final-report`
- `write-phase2-commit-plan`
- `check-phase2-commit-plan`

## Completion criteria

Phase 2 CI/CD foundation is complete when:

- `.github/workflows/ci.yml` exists.
- The CI workflow runs on pull requests.
- The CI workflow runs on pushes to the main branch.
- The CI workflow uses Node.js 20.
- The CI workflow uses `npm ci` instead of `npm install`.
- The CI workflow runs typecheck, tests, and build.
- The Phase 2 file inventory checker passes.
- The Phase 2 package alias checker passes.
- The local Phase 2 CI/CD checker passes.
- `phase2-cicd-report.json` reports success.
- `phase2-final-report.txt` is reviewed.
- `phase2-commit-plan.json` reports ready to commit.
- A first CI run completes successfully in GitHub Actions.

## Expected gaps before implementation

Before the CI workflow is fully aligned, the Phase 2 checker is expected to flag:

- Missing `main` push trigger.
- Missing `node-version: 20`.
- Missing `npm ci`.
- Forbidden `npm install` usage.
- Missing typecheck, test, or build gates.

## Exit criteria

Phase 2 can be marked complete only after the workflow file is committed, `npm run phase2:finalize` passes locally, `phase2-final-report.txt` is reviewed, `phase2-commit-plan.json` is ready, and a real GitHub Actions run passes.
