# P0 External Security Review Evidence Runbook

This runbook closes the `external-security-review-or-pentest` P0 runtime evidence item only after an external security review, penetration test, or formally approved private-beta exception is documented.

## Scope

Evidence must prove that a qualified reviewer or assessor reviewed the release risk before public production or enterprise procurement.

Acceptable closure paths:

- External penetration test completed, findings triaged, and critical/high issues resolved or formally accepted.
- External security review completed, findings triaged, and critical/high issues resolved or formally accepted.
- Formal private-beta exception approved with owner, rationale, compensating controls, and expiry date.

## Evidence rules

Do not commit confidential report contents if the report is private.

Allowed evidence examples:

- Redacted executive summary with report id, assessor, dates, scope, and finding counts
- Private report storage reference plus reviewer approval comment
- Finding tracker export with identifiers, severities, dispositions, and retest status, with sensitive details redacted
- Private-beta exception record with expiry and compensating controls

Required reviewer confirmations:

- Assessment scope included the production-like app, authentication, authorization, tenant isolation, API endpoints, and deployment configuration where applicable
- Critical and high findings are resolved, retested, accepted by a risk owner, or covered by a private-beta exception
- Medium findings have owners and due dates
- Report or exception evidence is durable and reviewable by release approvers

## Fill the JSON evidence file

Copy `docs/security/evidence/templates/external-security-review-or-pentest.template.json` to:

```text
docs/security/evidence/runtime/external-security-review-or-pentest.json
```

Then replace every placeholder with real reviewed evidence.

The file is only valid when:

- `status` is `Complete` or `Exception`
- `redactionConfirmation` exactly equals `All secrets, tokens, credentials, connection strings, and access-granting values are redacted.`
- `Complete` evidence includes review provider, scope, finding summary, critical/high disposition, and durable evidence references
- `Exception` evidence includes risk owner, rationale, expiry date, compensating controls, and approval reference

## Go/no-go

Do not mark this P0 item as `Complete` unless an actual external review or pentest has completed and release-blocking findings are resolved or formally accepted.

If the app remains private beta, use `Exception` only when the release owner explicitly approves the risk and expiry date.
