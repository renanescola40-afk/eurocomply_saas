# P0 External Security Review Evidence Runbook

This runbook closes the `external-security-review-or-pentest` P0 runtime evidence item only after a real external security review or penetration test is documented, reviewed, and triaged.

## Closure paths

Acceptable non-enterprise closure paths:

- External penetration test completed, findings triaged, and critical/high issues resolved or formally accepted.
- External security review completed, findings triaged, and critical/high issues resolved or formally accepted.
- Formal private-beta exception approved with owner, rationale, compensating controls, and expiry date.

Enterprise release has a stricter rule: `Exception` is not sufficient. Enterprise release requires `status: Complete`, a real external review or pentest report reference, and passing retest/triage evidence.

## Required scope coverage

Use `docs/security/PENTEST_SCOPE.md` as the source of truth. The evidence package must confirm coverage for auth, RBAC, tenant isolation, APIs, uploads, billing, audit chain, exports, GDPR delete, rate limiting, and webhooks.

Use `docs/security/PRE_PENTEST_CHECKLIST.md` to prepare the safe test environment before sharing access with reviewers.

## Evidence rules

Do not commit confidential report contents if the report is private.

Allowed evidence examples:

- Redacted executive summary with report id, assessor, dates, scope, and finding counts
- Private report storage reference plus reviewer approval comment
- Finding tracker export with identifiers, severities, owners, due dates, dispositions, and retest status, with sensitive details redacted
- Retest record proving critical findings are not pending, failed, or missing retest
- Private-beta exception record with expiry and compensating controls, for non-enterprise private beta only

Required reviewer confirmations:

- Scope coverage matches `docs/security/PENTEST_SCOPE.md`
- Critical and high findings are resolved or formally accepted
- Critical findings do not have pending, failed, missing, or not-started retest status
- Medium findings have owners and due dates
- Report or exception evidence is durable and reviewable by release approvers

## Fill the JSON evidence file

For preparation, the repository may keep `docs/security/evidence/runtime/external-security-review-or-pentest.json` as an `Open` placeholder. That placeholder is intentionally not proof of completion.

After a real review exists, copy `docs/security/evidence/templates/external-security-review-or-pentest.template.json` to:

```text
docs/security/evidence/runtime/external-security-review-or-pentest.json
```

Then replace every placeholder with real reviewed evidence.

The file is only enterprise-valid when:

- `status` is `Complete`
- `outcome` is `passed` or `passed_with_formal_acceptance`
- `review.reviewType`, `review.provider`, `review.reportDate`, `review.reportReference`, `review.reviewedBy`, and `review.reviewedAt` are populated
- `evidenceIntegrity.placeholderOnly` is `false`
- `evidenceIntegrity.realExternalReportAttached` is `true`
- `controlsVerified` includes every control in `docs/security/PENTEST_SCOPE.md`
- every finding has owner, severity, due date, status, and retest status
- every critical/high finding is resolved or formally accepted
- no critical finding has pending or failed retest

## Required commands

Run the evidence-level checker:

```bash
node scripts/security/check-p0-external-review-evidence.mjs
```

Run the enterprise release gate before enterprise approval:

```bash
npm run release:enterprise-readiness
```

The enterprise command must fail while the runtime JSON remains `Open` or references only placeholder evidence.

## Go/no-go

Do not mark this P0 item as `Complete` unless an actual external review or pentest has completed and release-blocking findings are resolved or formally accepted.

If the app remains private beta, use `Exception` only when the release owner explicitly approves the risk and expiry date. Do not use `Exception` for enterprise release.
