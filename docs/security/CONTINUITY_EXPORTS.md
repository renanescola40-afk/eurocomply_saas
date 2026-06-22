# Continuity export response contract

Continuity exports are privileged JSON downloads and must follow the same public response contract as other high-risk exports.

## Required controls

- Require an authenticated user, organization context, `export_data` permission, business-plan entitlement, distributed rate limit, and step-up verification before creating the export.
- Use `publicStepUpSummary(stepUp.assessment)` in the exported payload. Internal step-up fields stay server-side in audit metadata only.
- Use `noStoreDownload` for the JSON attachment so exports are not cached by browsers or intermediaries.
- Sanitize the attachment filename before writing `Content-Disposition`.
- Use stable public error codes and no-store JSON responses for errors.

## Regression coverage

`security:enterprise-api` delegates to `scripts/security/check-continuity-export-contract.mjs`, which verifies the public step-up summary, no-store download helper, sanitized filename, and absence of internal step-up assessment fields in the exported payload.
