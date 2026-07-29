# ADR: Qualified Review Evidence Handoff Boundary

## Status

Accepted.

## Context

Qualified review records span campaigns, workstreams, assignments, reviewers, submissions and decisions. A release operator needs one reproducible package without converting technical evidence into a false compliance approval.

## Decision

- Build the package from authoritative tenant-scoped records.
- Bind every item to one exact 40-character commit SHA.
- Require eight accepted reviews totaling exactly 51 points.
- Sort items and blockers before hashing.
- Persist only complete packages through a backend-only RPC.
- Supersede prior packages rather than rewriting them.
- Keep the explicit state `HUMAN_REVIEW_REQUIRED` even when the technical package is complete.

## Security consequences

- Only token digests and evidence integrity hashes are used as integrity material.
- The projection is `security_invoker` and anonymous access is revoked.
- Finalization requires authenticated organization management permission, trusted Origin, bounded input and fail-closed rate limiting.
- A digest or target-SHA mismatch blocks handoff.

## Non-goals

This design does not create reviewer qualifications, opinions, approvals, certification, legal conclusions, regulator acceptance or notified-body assessment.
