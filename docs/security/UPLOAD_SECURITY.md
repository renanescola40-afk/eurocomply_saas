# Enterprise upload/download/preview security standard

This standard covers document upload, storage, signed download and preview flows for enterprise tenants.

## Scope

User-submitted controlled documents must flow through `src/server/security/upload-security.ts` before any storage write. The module centralizes size checks, filename sanitization, path traversal prevention, extension allow-listing, declared MIME validation, magic-number/file-signature validation, SHA-256 hashing, malware scanner invocation, tenant-scoped storage path construction and signed URL expiry policy.

## Enterprise fail-closed rule

Enterprise deployments must set:

```txt
REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true
MALWARE_SCANNER_PROVIDER=<real provider>
MALWARE_SCANNER_API_KEY=<server-only secret when the provider needs one>
```

An enterprise upload is allowed only when the malware scanner returns `clean`. Scanner unavailable, timeout, unsupported provider, malformed provider response, `suspicious`, `infected`, `error` and `not_configured` all block the upload before storage or document metadata writes. Mock scanner providers are limited to test/development and must never be configured in production.

## Allowed uploaded content

Allowed user upload MIME types:

```txt
application/pdf
image/png
image/jpeg
application/vnd.openxmlformats-officedocument.wordprocessingml.document
application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

Uploads are blocked for empty files, files over 10 MB, path traversal filenames, unsupported extensions, dangerous double extensions, executables/scripts, MIME spoofing, invalid magic numbers, extension/content mismatch, PDF active content and OpenXML macro/OLE/ActiveX/embedded package markers.

## Tenant isolation

Storage paths must include the organization id as the first path segment and the actor user id as the second segment:

```txt
<organizationId>/<actorUserId>/<uuid>.<ext>
```

The application must call tenant-prefix guards before storage writes, deletes, downloads or previews. Supabase storage policies keep `controlled-documents` private and block direct authenticated client reads/writes so RBAC, audit logging and malware scanning cannot be bypassed.

## Signed download and preview URLs

Downloads and previews are backend-mediated through `src/server/actions/document-downloads.ts`:

1. Require authenticated user.
2. Resolve the user's organization memberships.
3. Select the document by `id` and allowed `organization_id` list.
4. Require `documents:read` with RBAC.
5. Assert the storage path still starts with the document's organization id.
6. Create a signed URL with short expiry only after those checks pass.

Signed URLs expire after 60 seconds. Preview URLs use the same membership, RBAC and tenant storage-prefix validation as download URLs.

## Audit events

The following redacted events must be emitted without file content, secrets or raw provider payloads:

| Event | When |
| --- | --- |
| `upload_requested` | After authenticated tenant/RBAC upload request is received. |
| `upload_scanned` | After the scanner returns a verdict. |
| `upload_blocked` | Before rejecting an upload for validation or scan policy. |
| `document_upload_rejected` | Compatibility event for existing document upload rejection evidence. |
| `document_uploaded` | After a scanned, tenant-scoped object and metadata record are created. |
| `download_requested` | Before a signed download or preview lookup. |
| `download_denied` | Before refusing cross-tenant, missing-permission, invalid-path or URL-creation-failed access. |

Logs and audit metadata must never contain document bytes, raw file contents, `MALWARE_SCANNER_API_KEY`, bearer tokens or unredacted scanner payloads.

## Required metadata

Audit metadata and persisted document metadata must include:

```txt
scanStatus
scanProvider
scanRequired
scanCheckedAt
fileHash
fileSize
mimeDetected
```

Database columns mirror the camelCase metadata using `scan_status`, `scan_provider`, `scan_required`, `scan_checked_at`, `file_hash`, `file_size`, `mime_detected` and `upload_security_metadata`.

## CI gates

The upload security gate must fail if enterprise scanning is bypassed or key controls are removed:

```bash
npm run security:upload
npm run security:upload-content-scan
npm run test -- tests/security/upload-malware-scan-validation.test.ts tests/security/upload-security-module.test.ts src/server/security/file-signature.test.ts
```

`npm run security:ci` reaches these gates through `security:enterprise-api`; direct gate execution remains mandatory during focused upload-security changes.

## Release checklist

Before enabling enterprise uploads, verify that the target environment has a reachable real scanner provider, `REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true`, provider credentials in a server-only secret store, Supabase migrations applied, direct storage access locked down, and the runtime evidence file updated.
