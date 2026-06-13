# EuroComply Upload Content Scanning Policy

This document defines the upload content scanning policy for user-submitted files.

## Purpose

EuroComply accepts customer documents that may contain sensitive compliance evidence. Upload handling must reduce the risk of unsafe files being stored, processed or redistributed.

## Current Controls

| Control | Location |
| --- | --- |
| File signature validation | `src/server/security/file-signature.ts` |
| Upload content scan helper | `src/server/security/malware-scan.ts` |
| Upload endpoint | `src/app/api/documents/upload/route.ts` |
| Upload security gate | `scripts/security/check-upload-security.mjs` |
| Upload content scan gate | `scripts/security/check-upload-content-scan.mjs` |

## Required Environment Variables

| Variable | Purpose |
| --- | --- |
| `REQUIRE_MALWARE_SCAN_FOR_UPLOADS` | When `true`, uploads must fail closed if scanning is unavailable or not clean. |
| `MALWARE_SCANNER_PROVIDER` | Identifies the configured scanning provider. |

## Deployment Modes

### Advisory Mode

Used while no provider is connected:

```txt
REQUIRE_MALWARE_SCAN_FOR_UPLOADS=false
MALWARE_SCANNER_PROVIDER=none
```

In this mode the helper records scan evidence, but unavailable scanning does not block upload by default.

### Enterprise Fail-Closed Mode

Required for enterprise production:

```txt
REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true
MALWARE_SCANNER_PROVIDER=<configured-provider>
```

In this mode upload must be rejected unless the scan status is clean.

## Expected Upload Evidence

Upload audit metadata should include:

```txt
scanStatus
scanProvider
scanRequired
scanCheckedAt
```

Blocked uploads should record a rejection event with scan context before returning an error response.

## Release Rule

Do not claim enterprise upload readiness until:

```txt
scanUploadForMalware is called before storage upload
shouldBlockUploadForMalwareScan is enforced
REQUIRE_MALWARE_SCAN_FOR_UPLOADS is enabled in enterprise production
MALWARE_SCANNER_PROVIDER points to a real scanning provider
upload rejection audit events include scan status and provider
```

## Future Work

- Integrate a real scanning provider.
- Add provider-specific timeout and retry policy.
- Add quarantine workflow for non-clean files.
- Add admin-facing evidence for rejected uploads.
- Add metrics for scan unavailable, clean, rejected and timeout outcomes.
