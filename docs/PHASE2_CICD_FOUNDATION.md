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
node scripts/dev/run-phase2-complete.mjs
```

After aliases are added, the preferred command is:

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

The complete runner validates file inventory, documentation, generated report hygiene, package aliases, CI/CD workflow requirements, and writes the final Phase 2 report.

## Local diagnostic outputs

The Phase 2 checker writes local diagnostics that should not be committed:

- `phase2-cicd-report.json`
- `phase2-final-report.txt`

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
- A first CI run completes successfully in GitHub Actions.

## Expected gaps before implementation

Before the CI workflow is fully aligned, the Phase 2 checker is expected to flag:

- Missing `main` push trigger.
- Missing `node-version: 20`.
- Missing `npm ci`.
- Forbidden `npm install` usage.
- Missing typecheck, test, or build gates.

## Exit criteria

Phase 2 can be marked complete only after the workflow file is committed, `npm run phase2:complete` passes locally, `phase2-final-report.txt` is reviewed, and a real GitHub Actions run passes.
