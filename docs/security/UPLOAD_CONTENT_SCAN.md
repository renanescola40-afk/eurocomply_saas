# EuroComply Upload Content Scanning Policy

This document defines the upload content scanning policy for user-submitted files.

## Purpose

EuroComply accepts customer documents that may contain sensitive compliance evidence. Upload handling must reduce the risk of unsafe files being stored, processed, previewed or redistributed across tenants.

## Current Controls

| Control | Location |
| --- | --- |
| File signature and real MIME validation | `src/server/security/file-signature.ts` |
| Upload content scan helper | `src/server/security/malware-scan.ts` |
| Upload endpoint | `src/app/api/documents/upload/route.ts` |
| Server action upload path | `src/server/actions/documents.ts` |
| Signed URL download guard | `src/server/actions/document-downloads.ts` |
| Upload security gate | `scripts/security/check-upload-security.mjs` |
| Upload content scan gate | `scripts/security/check-upload-content-scan.mjs` |
| Runtime evidence | `docs/security/evidence/runtime/upload-malware-scan-validation.json` |
| Enterprise CI delegation | `scripts/security/check-enterprise-api-security.mjs` |

## Required Environment Variables

| Variable | Purpose |
| --- | --- |
| `REQUIRE_MALWARE_SCAN_FOR_UPLOADS` | When `true`, uploads must fail closed if scanning is unavailable or not clean. Enterprise production must set this to `true`. |
| `MALWARE_SCANNER_PROVIDER` | Identifies the configured scanning provider. Supported values are `clamav`, `clamd`, `http`, `generic-http` and `webhook`. |
| `MALWARE_SCANNER_TIMEOUT_MS` | Optional scanner timeout. Defaults to 10 seconds. |
| `MALWARE_SCANNER_CLAMAV_HOST` / `MALWARE_SCANNER_CLAMAV_PORT` | ClamAV/clamd TCP endpoint. Defaults to `127.0.0.1:3310`. |
| `MALWARE_SCANNER_ENDPOINT` or `MALWARE_SCANNER_URL` | HTTP scanner endpoint for `http`, `generic-http` or `webhook` provider modes. |
| `MALWARE_SCANNER_API_KEY` | Optional bearer token for HTTP scanner integrations. |

## Deployment Modes

### Advisory Mode

Used only for non-enterprise environments while no provider is connected:

```txt
REQUIRE_MALWARE_SCAN_FOR_UPLOADS=false
MALWARE_SCANNER_PROVIDER=none
```

In this mode the helper records scan evidence, but unavailable scanning does not block upload by default. Provider-reported `infected`, `suspicious` or `error` verdicts still block uploads.

### Enterprise Fail-Closed Mode

Required for enterprise production:

```txt
REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true
MALWARE_SCANNER_PROVIDER=clamav
# or: MALWARE_SCANNER_PROVIDER=http
```

In this mode upload is rejected unless the scan status is `clean`. `not_configured`, `unavailable`, `suspicious`, `infected` and `error` all block storage.

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
malware scan is required and not clean
provider reports infected, suspicious or scan error
```

Allowed document MIME types are PDF, PNG, JPEG, DOCX and XLSX. TXT, SVG, HTML, scripts, executables, archives and generic ZIP files are not accepted as controlled document uploads.

## Tenant Isolation and Download Policy

Stored document paths must start with the owning `organizationId`. Supabase storage policies and application guards both enforce the same `<organizationId>/...` prefix. Signed download URLs are created only after the user is confirmed as a member of the document organization and has `documents:read`; URLs expire after 60 seconds.

## Expected Upload Evidence

Upload audit metadata should include:

```txt
scanStatus
scanProvider
scanRequired
scanCheckedAt
fileHash
organizationId
actorUserId
```

Blocked uploads should record a rejection event with scan context before returning an error response.

## CI Coverage

`npm run security:enterprise-api` delegates to both upload gates so the normal `npm run security:ci` path fails if upload signature validation, content scanning, fail-closed behavior or audit evidence coverage regresses.

The upload gates must remain runnable on their own for focused investigations:

```bash
npm run security:upload
npm run security:upload-content-scan
npm run test -- tests/security/upload-malware-scan-validation.test.ts
```

## Release Rule

Do not claim enterprise upload readiness until:

```txt
scanUploadForMalware is called before storage upload
shouldBlockUploadForMalwareScan is enforced
REQUIRE_MALWARE_SCAN_FOR_UPLOADS is enabled in enterprise production
MALWARE_SCANNER_PROVIDER points to a real scanning provider
upload rejection audit events include scan status and provider
security:ci delegates to upload security gates
cross-tenant signed URL tests pass
```
