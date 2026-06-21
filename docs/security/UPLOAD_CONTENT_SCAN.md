# EuroComply Upload Content Scanning Policy

This document is the Upload Content Scan Security Standard for user-submitted files.

## Purpose

EuroComply accepts customer documents that may contain sensitive compliance evidence. Upload handling must reduce the risk of unsafe files being stored, processed, previewed or redistributed across tenants.

## Current Controls

| Control | Location |
| --- | --- |
| Central upload/download/preview security orchestration | `src/server/security/upload-security.ts` |
| File signature, real MIME and active-content validation | `src/server/security/file-signature.ts` |
| Real malware scanner provider integrations | `src/server/security/malware-scan.ts` |
| Upload endpoint | `src/app/api/documents/upload/route.ts` |
| Server action upload path | `src/server/actions/documents.ts` |
| Signed URL download/preview guard | `src/server/actions/document-downloads.ts` |
| Upload security gate | `scripts/security/check-upload-security.mjs` |
| Upload content scan gate | `scripts/security/check-upload-content-scan.mjs` |
| Enterprise upload standard | `docs/security/UPLOAD_SECURITY.md` |
| Runtime evidence | `docs/security/evidence/runtime/upload-malware-scan-validation.json` |
| Enterprise CI delegation | `package.json` `security:ci` |

## Required Environment Variables

| Variable | Purpose |
| --- | --- |
| `REQUIRE_MALWARE_SCAN_FOR_UPLOADS` | When `true`, uploads must fail-closed if scanning is unavailable or not clean. Enterprise production must set this to `true`. |
| `MALWARE_SCANNER_PROVIDER` | Identifies the configured scanning provider. Supported real values are `clamav`, `clamd`, `http`, `generic-http` and `webhook`. |
| `MALWARE_SCANNER_TIMEOUT_MS` | Optional scanner timeout. Defaults to 10 seconds. Timeout blocks enterprise uploads. |
| `MALWARE_SCANNER_CLAMAV_HOST` / `MALWARE_SCANNER_CLAMAV_PORT` | ClamAV/clamd TCP endpoint. Defaults to `127.0.0.1:3310`. |
| `MALWARE_SCANNER_ENDPOINT` or `MALWARE_SCANNER_URL` | HTTP scanner endpoint for `http`, `generic-http` or `webhook` provider modes. |
| `MALWARE_SCANNER_API_KEY` | Server-only bearer token, or equivalent server-side authorization, for HTTP scanner integrations. |

## Deployment Modes

### Advisory Mode

Used only for non-enterprise environments while no provider is connected:

```txt
REQUIRE_MALWARE_SCAN_FOR_UPLOADS=false
MALWARE_SCANNER_PROVIDER=none
```

In this advisory mode the helper records scan evidence, but unavailable scanning does not block upload by default. Provider-reported `infected`, `suspicious` or `error` verdicts still block uploads.

### Enterprise Fail-Closed Mode

Required for enterprise production:

```txt
REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true
MALWARE_SCANNER_PROVIDER=clamav
# or: MALWARE_SCANNER_PROVIDER=http
```

In this fail-closed mode upload is rejected unless the scan status is `clean`. `not_configured`, `unavailable`, `timeout`, `suspicious`, `infected` and `error` all block storage and document metadata writes.

## Provider Contracts

### ClamAV / clamd

`MALWARE_SCANNER_PROVIDER=clamav` or `clamd` uses the clamd `INSTREAM` protocol over TCP. The app streams the exact bytes that will be stored, and accepts only an `OK` verdict. `FOUND`, `ERROR`, timeouts and connection failures block enterprise uploads.

### HTTP / webhook

`MALWARE_SCANNER_PROVIDER=http`, `generic-http` or `webhook` sends a POST request to `MALWARE_SCANNER_ENDPOINT`/`MALWARE_SCANNER_URL` with the file bytes and these headers:

```txt
content-type
x-eurocomply-filename
x-eurocomply-organization-id
x-eurocomply-file-sha256
authorization: Bearer <MALWARE_SCANNER_API_KEY>
```

The provider must return JSON with `status`, `verdict` or `result` set to a supported clean/blocked value. Unknown or malformed responses are treated as unsafe.

### Mock provider restriction

Mock providers are available only through `registerMalwareScannerProviderForTest` in test/development. `mock`, `test` and `dev-mock` are never valid enterprise production scanner providers.

## Upload Validation Policy

Uploads are rejected before storage if any of the following checks fail:

```txt
size > 10 MB
empty file
unsupported extension
unsafe/double extension such as .pdf.exe
unsupported real MIME/magic number
claimed MIME does not match detected MIME
extension does not match detected content
PDF active content such as /JavaScript, /OpenAction, /Launch, /RichMedia or embedded files
OpenXML active content such as vbaProject.bin, macro sheets, ActiveX, OLE or embedded packages
malware scan is required and not clean
provider reports infected, suspicious or scan error
```

Allowed document MIME types are PDF, PNG, JPEG, DOCX and XLSX. TXT, SVG, HTML, scripts, executables, archives and generic ZIP files are not accepted as controlled document uploads.

## Tenant Isolation and Download Policy

Stored document paths must start with the owning `organizationId`. Application guards enforce the same `<organizationId>/...` prefix before storage writes, deletes or signed URL creation. Upload paths include the actor user id under the organization prefix: `<organizationId>/<actorUserId>/<uuid>.<ext>`. Authenticated clients must not read, upload, update or delete `controlled-documents` storage objects directly; storage policies intentionally return false for direct authenticated access so every document read is backend-mediated.

Signed download and preview URLs are created only after the user is confirmed as a member of the document organization and has `documents:read`; URLs expire after 60 seconds. This prevents direct storage reads from bypassing RBAC, audit events or tenant-scoped document lookup.

Backend-generated template documents may use `text/markdown` in the bucket because they are created by trusted server actions, not accepted from user upload forms. User-submitted uploads remain restricted to PDF, PNG, JPEG, DOCX and XLSX.

## Expected Upload Evidence

Upload audit metadata and persisted document metadata should include:

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

Blocked uploads record `upload_blocked` and compatibility `document_upload_rejected` events with scan context before returning an error response. Successful scans record `upload_scanned` before storage.

## CI Coverage

`npm run security:ci` includes both upload gates so the normal security path fails if upload signature validation, content scanning, fail-closed behavior or audit evidence coverage regresses.

The upload gates must remain runnable on their own for focused investigations:

```bash
npm run security:upload
npm run security:upload-content-scan
npm run test -- tests/security/upload-malware-scan-validation.test.ts src/server/security/file-signature.test.ts
```

## Enterprise Release Rule

Do not claim enterprise upload readiness until:

```txt
scanValidatedUploadForMalware is called before storage upload
shouldBlockUploadForMalwareScan is enforced
REQUIRE_MALWARE_SCAN_FOR_UPLOADS is enabled in enterprise production
MALWARE_SCANNER_PROVIDER points to a real scanning provider
active content blocking tests pass for PDF and OpenXML
upload rejection audit events include scan status and provider
security:ci delegates to upload security gates
cross-tenant signed URL tests pass
signed URL expiry tests pass
direct authenticated storage reads and writes remain blocked
```
