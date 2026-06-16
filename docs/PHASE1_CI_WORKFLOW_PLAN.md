# Phase 1 CI Workflow Plan

This plan defines the GitHub Actions workflow required to move Phase 1 from local-only validation to CI-backed validation.

## Required workflow path

```text
.github/workflows/phase1-local-base.yml
```

## Required trigger

```yaml
on:
  pull_request:
  workflow_dispatch:
```

## Required job steps

```yaml
jobs:
  phase1-local-base:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm run supply-chain:lockfile
      - run: npm run phase1:capture
      - run: npm run phase1:check
```

## Required artifact step

When workflow file writes are available, add an artifact upload step with `if: always()` for:

```text
docs/evidence/phase1
```

## Completion rule

Phase 1 CI validation is not complete until the workflow exists, runs successfully, and preserves the Phase 1 evidence logs from a real GitHub Actions run.

## Current limitation

The repository-side CI workflow could not be created in this session because writes to `.github/workflows` were blocked. This document records the required workflow so it can be added as soon as that path is writable.
