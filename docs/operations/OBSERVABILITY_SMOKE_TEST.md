# Observability Smoke Test

Use this checklist after deploying a Vercel Preview with monitoring variables configured.

## Route

`POST /api/observability/smoke`

The route is no-store, POST-only, and uses the existing internal readiness access check.

## Steps

1. Deploy a Vercel Preview.
2. Call the route with the same access method used for `/api/ready`.
3. Confirm the JSON response contains `status: sent`.
4. Confirm that a `risck_comply_observability_smoke_test` event appears in the monitoring project.
5. Confirm the event does not contain raw headers, cookies, user payloads, database admin keys, or document content.
6. Compare the event timestamp with Vercel runtime logs and Supabase logs when debugging.
