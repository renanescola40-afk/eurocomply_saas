# Maintenance cron timeout hardening

Date: 2026-06-13

## Status

Patched and waiting for Vercel CI.

## What changed

- Added a per-job timeout to `src/app/api/internal/daily-maintenance/route.ts`.
- Default timeout: `25_000` ms.
- Optional override: `DAILY_MAINTENANCE_JOB_TIMEOUT_MS`.
- Documented `CRON_SECRET`, `INTERNAL_CRON_SECRET`, and `DAILY_MAINTENANCE_JOB_TIMEOUT_MS` in `.env.example`.

## Why

The daily maintenance aggregator runs multiple internal jobs sequentially. Without a timeout, one stalled internal endpoint could hold the whole cron execution window and prevent later jobs from running.

## Commits

- `cc3642760e2e9a0e8b20a0127aab0060254735ee` — add timeout around each maintenance job fetch.
- `c52a9aef8e3c81c2f36405267869ee8410e41e49` — document cron env variables and production checklist.

## Follow-up

- Confirm Vercel build passes after `npm install --ignore-scripts` and the cron timeout change.
- Review `npm audit --json` details before changing dependencies.
- Confirm `CRON_SECRET` or `INTERNAL_CRON_SECRET` exists in Vercel project settings.
