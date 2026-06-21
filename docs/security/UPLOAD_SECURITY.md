# Enterprise Upload Security Standard

This standard covers upload, storage, download and preview handling for controlled customer documents.

## Security objective

Enterprise uploads must fail closed. A user-submitted document is stored only after all local validation succeeds and the configured malware scanner returns `clean` for the exact bytes that will be written to storage.

## Central module

The authoritative runtime module is `src/server/security/upload-security.ts`. Upload code should call that module instead of reimplementing ad-hoc checks in routes or server actions.

The module provides:

- maximum size enforcement through `MAX_UPLOAD_BYTES`;
- extension and MIME allow-listing through `ALLOWED_TYPES`;
- declared MIME validation;
- magic number/file signature validation;
- SHA-256 hashing through `fileHash` / `checksumSha256`;
- filename sanitization through `sanitizeUploadFileName`;
- path traversal prevention through tenant path assertions;
- executable/script blocking through dangerous extension and active-content detection;
- scan orchestration through `scanValidatedUploadForMalware`;
- short signed URL expiry helpers through `SIGNED_DOCUMENT_URL_EXPIRES_IN_SECONDS` and `isSignedUrlExpired`.

## Allowed upload types

User-submitted controlled document uploads are limited to:

| Type | MIME |
| --- | --- |
| PDF | `application/pdf` |
| PNG | `image/png` |
| JPEG | `image/jpeg` |
| Word OpenXML | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Excel OpenXML | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

Scripts, executables, HTML/SVG, macro-enabled Office formats, generic ZIP archives and double-extension names such as `invoice.pdf.exe` are blocked before malware scanning and before storage.

## Enterprise malware scanner contract

Required enterprise configuration:

```txt
REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true
MALWARE_SCANNER_PROVIDER=clamav
# or: MALWARE_SCANNER_PROVIDER=http
```

Provider secrets are server-only. HTTP/webhook integrations must use `MALWARE_SCANNER_ENDPOINT` or `MALWARE_SCANNER_URL` and `MALWARE_SCANNER_API_KEY` or equivalent server-side authorization. ClamAV integrations use `MALWARE_SCANNER_CLAMAV_HOST` and `MALWARE_SCANNER_CLAMAV_PORT`.

Supported real providers are `clamav`, `clamd`, `http`, `generic-http` and `webhook`. Mock providers are restricted to test/development through `registerMalwareScannerProviderForTest`; they are unavailable in enterprise production.

## Fail-closed decision table

| Scanner condition | Enterprise result |
| --- | --- |
| `clean` | allow upload |
| scanner unavailable | block upload |
| scanner timeout | block upload |
| scanner not configured | block upload |
| `suspicious` | block upload |
| `infected` | block upload |
| scanner error or malformed provider response | block upload |

Upload storage and document metadata insertion happen only after a clean verdict.

## Tenant isolation

Storage paths must include the owning `organizationId` as the first path segment:

```txt
<organizationId>/<actorUserId>/<uuid>.<extension>
```

The application validates this prefix before upload, delete, download or preview operations. User-supplied filenames are not used as storage path authority. Path traversal segments, empty segments and cross-tenant prefixes are rejected.

## Download and preview

Downloads and previews are backend mediated. The signed URL action performs:

1. authenticated user lookup;
2. organization membership lookup;
3. tenant-scoped document query;
4. `documents:read` RBAC check;
5. storage path prefix validation;
6. short-lived signed URL creation.

signed URLs expire after 60 seconds. Preview uses the same membership/RBAC/storage checks as download, with a preview access purpose and without exposing direct client storage reads.

## Audit events

The upload/download security audit event names are:

| Event | When emitted |
| --- | --- |
| `upload_requested` | authenticated upload attempt accepted for validation |
| `upload_scanned` | malware scanner returned a verdict |
| `upload_blocked` | validation, scanner or policy blocked an upload |
| `download_requested` | signed download/preview request started |
| `download_denied` | membership, RBAC, tenant scope or signed URL creation denied access |

Legacy document events such as `document_upload_rejected`, `document_uploaded` and `document.download_url_rejected` may still be emitted for compatibility, but new controls should key off the events above.

Audit/log metadata must not include file bytes or extracted document content. It should include only control evidence and safe identifiers:

```txt
scanStatus
scanProvider
scanRequired
scanCheckedAt
fileHash
fileSize
mimeDetected
organizationId
actorUserId
```

## Persisted metadata

The `documents` table stores upload security evidence when the migration is applied:

```txt
scan_status
scan_provider
scan_required
scan_checked_at
file_hash
file_size
mime_detected
```

The application also keeps compatibility fields such as `checksum_sha256`, `mime_type` and `size_bytes`.

## CI/security gates

The following commands must stay green before enterprise release:

```bash
npm run lint
npm run typecheck
npm run test
npm run security:upload
npm run security:upload-content-scan
npm run build
```

`npm run security:ci` includes `security:upload` and `security:upload-content-scan`, so enterprise upload scanning bypasses fail the security CI path.

## Evidence

Runtime evidence is tracked in `docs/security/evidence/runtime/upload-malware-scan-validation.json`. The evidence must mention `src/server/security/upload-security.ts`, fail-closed scanner behavior, tenant-scoped storage paths, RBAC-validated download/preview and the audit events listed above.
