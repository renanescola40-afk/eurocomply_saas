# Enterprise Access Secure Export Closeout

## Objective

Close the final controllable identity/access evidence-delivery gap by issuing short-lived, tenant-bound signed download URLs only after authorization, step-up verification, integrity validation and durable audit persistence.

## Controls

- Uses the existing `/api/team/access-runtime` route to avoid route-inventory drift.
- Requires authenticated organization context and `manage_team`.
- Requires trusted mutation validation and step-up authentication.
- Applies distributed fail-closed export rate limiting.
- Loads the export job using both job ID and server-derived organization ID.
- Requires `completed` status, a non-expired artifact and a valid SHA-256 digest.
- Requires non-negative row count and byte size.
- Requires the object key to begin with `<organization_id>/` and rejects traversal markers.
- Issues a 120-second signed URL with a sanitized server-owned filename.
- Returns private no-store, nosniff and no-referrer headers.
- Records issued, denied, expired, integrity-failed and provider-failed outcomes.
- Download evidence is forced-RLS, service-role only and deny-delete for authenticated users.

## Operational flow

1. Administrator requests CSV or JSONL evidence from the Access Operations Console.
2. The background worker creates the artifact and stores SHA-256, byte size, row count and expiry.
3. Administrator requests download using the existing access-runtime mutation API.
4. The server revalidates tenant, role, step-up, status, expiry, digest and storage path.
5. A short-lived signed URL is created.
6. Audit persistence must succeed before the URL is returned.

## Failure semantics

- `export_not_completed`: artifact is not ready.
- `export_expired`: retention window elapsed.
- `invalid_export_integrity_metadata`: digest or size evidence is invalid.
- `invalid_tenant_storage_path`: object key is outside the tenant prefix.
- `signed_url_provider_failed`: storage provider did not issue a URL.
- `rate_limited`: repeated download attempts exceeded the policy.

No failure returns an unsigned object URL or raw storage key.

## Rollout

1. Apply the additive migration.
2. Configure `ENTERPRISE_ACCESS_EXPORT_BUCKET` when the default bucket is not used.
3. Confirm the worker writes objects under `<organization_id>/...`.
4. Run repository CI and Enterprise evidence tests.
5. Validate one completed CSV and one JSONL artifact in a staging Supabase project.
6. Confirm audit events and download counters increment exactly once per issued URL.

## External validation boundary

A real Supabase Storage bucket, signed URL download, production retention lifecycle and authenticated browser E2E remain `EXTERNAL_VALIDATION_REQUIRED`. Repository tests prove the security contract but do not claim provider execution.

## Rollback

Revert this PR. The schema is additive; existing export jobs and Access Operations Console reads remain usable without signed-download issuance.
