# Governance export contract

Vendor assurance, retention center, and security questionnaire exports are privileged governance downloads. They must follow the same response contract as the other enterprise JSON exports.

## Required controls

- Require authenticated organization context.
- Require `export_data` authorization.
- Require business plan entitlement where applicable.
- Require step-up for `export_data`.
- Apply distributed rate limiting before generating the export.
- Use `publicStepUpSummary(stepUp.assessment)` in exported JSON payloads.
- Keep detailed step-up metadata only in server-side audit metadata.
- Use `sanitizeDocumentDownloadFileName` before writing `Content-Disposition`.
- Use `noStoreDownload` for successful downloads.
- Use `noStoreJson` for error responses.
- Include `X-Content-Type-Options: nosniff` for JSON downloads.

## CI coverage

`security:enterprise-api` delegates to `scripts/security/check-governance-export-contracts.mjs`, which checks these export routes for the shared hardened contract.
