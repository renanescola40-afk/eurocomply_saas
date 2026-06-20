# 2026-06-20 upload validation audit

## Result

A safe non-breaking hardening patch was prepared on `audit/use-complete-upload-validation-20260620-0210`.

## Finding

`src/app/api/documents/upload/route.ts` was using `validateUploadFileSignature`, which confirms content signature but does not enforce the complete filename, extension, dangerous extension, MIME spoofing, and extension/content mismatch checks available in `validateUploadFileSecurity`.

## Correction

The route now calls `validateUploadFileSecurity` after reading the upload buffer and before malware scanning/storage. Rejected uploads are audited with the structured rejection reason and a 413/415 response.

## Validation still needed

Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run security:upload-content-scan
```

## Logging

Structured supplemental log: `agent_logs/2026-06-20-upload-validation-audit.json`.

Root `agent_log.json` still needs the same entry copied in after review because the connector returned that long file in truncated chunks during this run, making a safe full-file rewrite risky.
