# Qualified Review Evidence Handoff Runbook

## Purpose

Produce a deterministic, tenant-scoped evidence package for one qualified-review campaign and one exact commit SHA.

## Preconditions

- Eight canonical workstreams exist.
- Every assignment is accepted.
- Accepted weights total exactly 51.
- Every current submission targets the campaign SHA.
- Every submission has a SHA-256 integrity digest and valid-until date.
- Every acceptance decision is genuine and recorded.

## Procedure

1. Call `GET /api/ai-governance/qualified-reviews/evidence-package?campaignId=<uuid>`.
2. Review all returned blockers.
3. Do not finalize while blockers exist.
4. Call `POST /api/ai-governance/qualified-reviews/evidence-package/finalize` with the campaign ID.
5. Record the returned package ID and manifest SHA-256 in the operational ticket.
6. Independently compare the package target SHA with the release commit.
7. Provide the immutable package to the designated human approver.

## Human boundary

The package remains `HUMAN_REVIEW_REQUIRED`. It is evidence organization, not certification, legal advice, regulator acceptance or notified-body approval.

## Failure handling

- `409 evidence_package_incomplete`: resolve blockers; never bypass.
- `503 security_control_unavailable`: restore rate-limit or storage controls before retrying.
- Digest mismatch: treat the package as tampered and regenerate from authoritative records.
- SHA mismatch: stop the release and open a new campaign for the correct commit.

## Rollback

Revert the package and migration before production reliance. Historical packages remain append-oriented through supersession and must not be silently rewritten.
