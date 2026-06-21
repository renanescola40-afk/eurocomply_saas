# Enterprise Upload Security Standard

Enterprise uploads are fail-closed and controlled through `src/server/security/upload-security.ts`.

Required enterprise configuration includes:

```txt
REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true
MALWARE_SCANNER_PROVIDER=clamav
MALWARE_SCANNER_API_KEY=<server-side-only>
```

Upload/download audit events include `upload_requested`, `upload_scanned`, `upload_blocked`, `download_requested`, and `download_denied`.

Audit metadata includes safe identifiers such as `organizationId`, actor id, scan provider, scan status, file hash, file size and detected MIME type. It must never include file bytes or extracted document content.

Signed URLs expire after 60 seconds. Downloads and previews require membership, RBAC and tenant-scoped storage validation before a short-lived URL is issued.

Runtime evidence is tracked in `docs/security/evidence/runtime/upload-malware-scan-validation.json`.
