# Security Questionnaire Incident Runbook

## Trigger conditions

Use this runbook when a public questionnaire answer is inaccurate, exposes restricted information, links to unavailable evidence or creates an unsupported contractual or certification claim.

## Immediate response

1. Capture the affected answer ID, URL, release SHA and discovery time.
2. Classify severity: secret or tenant-data exposure is critical; overclaiming or stale evidence is high; broken public links are medium.
3. For critical exposure, remove the affected public surface immediately and rotate any exposed credential.
4. For inaccurate claims, downgrade the answer to `evidence-required` or `not-claimed` and deploy through the normal protected release path.
5. Confirm the JSON endpoint and localized page return the corrected content.
6. Notify active procurement owners who received the inaccurate answer.

## Validation

- run unit tests for `security-questionnaire`;
- run public claims and public secret scanning;
- confirm all evidence URLs are same-origin and return non-error responses;
- verify no tenant data, customer identifiers, secrets or internal URLs are present;
- record the exact remediation SHA.

## Post-incident review

Document cause, impacted buyers, correction time, whether external copies need replacement and which test or review control should prevent recurrence.

## Rollback

The feature is additive and read-only. Rollback by reverting the questionnaire page, API route and domain module together. Keep the procurement pack available unless it is independently affected.
