# Phase 2 Day 3 Closeout

Day 3 covers preview and production deploy evidence, health checks, and smoke testing.

## Required provider evidence

Create these files from real provider execution:

- `docs/evidence/phase2/day3-preview-deploy.md`
- `docs/evidence/phase2/day3-production-deploy.md`

Each file should include:

- deployment URL
- deployment environment
- commit SHA
- deployment timestamp
- deployment status
- reviewer or owner

## Smoke command

Run from the repository root after preview and production URLs exist:

```bash
PHASE2_PREVIEW_URL="https://preview.example.com" \
PHASE2_PRODUCTION_URL="https://app.example.com" \
npm run phase2:day3:smoke
```

Optional variables:

- `PHASE2_HEALTH_PATH`, default `/`
- `PHASE2_SMOKE_TIMEOUT_MS`, default `30000`

## Closeout command

```bash
npm run phase2:day3:closeout
```

This validates the deploy evidence files and the generated health/smoke logs.

## Required generated files

- `docs/evidence/phase2/day3-preview-deploy.md`
- `docs/evidence/phase2/day3-production-deploy.md`
- `docs/evidence/phase2/day3-health-check.log`
- `docs/evidence/phase2/day3-smoke-test.log`

## Pass criteria

Day 3 is complete when:

- preview deploy evidence exists
- production deploy evidence exists
- health check log has `## exitCode: 0`
- smoke test log has `## exitCode: 0`
- `npm run phase2:day3:evidence` exits with code 0

## Scope boundary

Do not start Day 4 until Day 3 evidence is committed and reviewed.
