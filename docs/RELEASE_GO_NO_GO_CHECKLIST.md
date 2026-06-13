# Release Go/No-Go Checklist

This checklist is the final decision aid for promoting EuroComply to beta, production, or enterprise customer environments.

It complements:

- `docs/RELEASE_CANDIDATE_VALIDATION.md`
- `docs/RELEASE_EVIDENCE_CHECKLIST.md`
- `docs/RELEASE_APPROVAL_RECORD.md`
- `docs/RELEASE_APPROVAL_LINKAGE.md`

## Decision outcomes

A release decision must result in exactly one of the following outcomes:

- **Go**: all mandatory gates are satisfied and no unresolved blocking risk remains.
- **Conditional Go**: all customer-impacting gates are satisfied, but one or more accepted exceptions are documented with owners and expiry dates.
- **No-Go**: at least one blocking gate is missing, failing, or unreviewed.

## Mandatory Go criteria

A release may be marked **Go** only when all of these are true:

- Security CI is green for the promoted commit.
- The promoted commit SHA is recorded in `docs/RELEASE_APPROVAL_RECORD.md`.
- Release evidence is complete according to `docs/RELEASE_EVIDENCE_CHECKLIST.md`.
- Supply-chain status is reviewed, including lockfile and npm audit evidence.
- Supabase RLS live validation evidence is attached or an explicit non-production exception exists.
- Audit-chain integrity evidence is attached, including transactional append readiness.
- Upload security evidence is attached, including signature validation and content scanning policy.
- Step-up authentication coverage is reviewed for protected actions.
- Billing and webhook behavior are validated for the target environment.
- Rollback owner and rollback trigger are recorded.
- External review, penetration test, or compensating review decision is recorded.

## Conditional Go criteria

A **Conditional Go** may be approved only when:

- No open exception allows customer data exposure beyond the intended tenant boundary.
- No open exception disables audit logging, audit-chain hashing, or RBAC enforcement.
- No open exception disables payment integrity controls for paid plans.
- Every exception has an owner, severity, target fix date, and customer-impact note.
- The approver explicitly accepts the remaining risk in `docs/RELEASE_APPROVAL_RECORD.md`.

## Automatic No-Go criteria

A release is **No-Go** if any of the following is true:

- Security CI is failing or has not run for the promoted commit.
- The promoted commit differs from the commit in the approval record.
- Release evidence is missing for build, CI, supply chain, database, audit-chain, or billing.
- A critical tenant isolation or RLS validation issue is open without an approved exception.
- Audit-chain append behavior is known to be non-transactional in the target production database.
- A billing webhook or checkout flow is unverified for the target environment.
- A required malware/content scanning policy is enabled but no provider or fail-closed behavior is verified.
- The rollback plan is missing or unowned.
- A high or critical vulnerability is untriaged.

## Evidence mapping

The final release reviewer should map each decision area to evidence:

| Area | Required evidence | Decision |
| --- | --- | --- |
| Build and CI | CI run URL, commit SHA | Go / Conditional Go / No-Go |
| Supply chain | lockfile, audit summary, triage notes | Go / Conditional Go / No-Go |
| Database and RLS | live validation output or exception | Go / Conditional Go / No-Go |
| Audit chain | hash-chain validation and RPC readiness | Go / Conditional Go / No-Go |
| Upload security | signature validation and scanning policy | Go / Conditional Go / No-Go |
| Step-up auth | protected action coverage and provider status | Go / Conditional Go / No-Go |
| Billing | Stripe checkout, portal, webhook evidence | Go / Conditional Go / No-Go |
| Observability | logging, alerting, incident owner | Go / Conditional Go / No-Go |
| External review | pentest/review report or accepted deferral | Go / Conditional Go / No-Go |

## Final decision record

The final decision must be copied into `docs/RELEASE_APPROVAL_RECORD.md` with:

- decision outcome
- commit SHA
- release owner
- final approver
- exception list
- rollback owner
- release date

## Enterprise rule

For enterprise procurement, **Conditional Go** is acceptable only for operational or evidence-timing gaps. It is not acceptable for unresolved tenant isolation, RBAC, audit-chain, billing integrity, or customer data protection gaps.
