# ADR: Manifest-driven runtime proof contracts and controlled evidence normalization

Date: 2026-07-21
Status: Proposed

## Context

The enterprise closeout dispatched every child workflow with only `release_sha`, although several required confirmations, one had no inputs, Supabase required a boolean input and recovery used an exercise selector. Artifact names also drifted, while legacy evidence lacked canonical promotion provenance. Successful runtime workflows therefore could not be promoted reliably.

## Decision

1. Define one versioned registry for all ten runtime lanes.
2. Bind every lane to an exact workflow, input map, artifact prefix, required evidence files and explicit control IDs.
3. Resolve only approved SHA and rollback-confirmation placeholders.
4. Require child workflows to verify the exact current `main` SHA.
5. Reject non-prefixed artifacts and normalize only validated, bounded, sanitized child evidence.
6. Never trust legacy `controlsVerified`; the registry owns promotion scope.
7. Require both isolated backup/restore and controlled rollback evidence for Recovery.
8. Keep release fail-closed until all critical controls pass.

## Security rationale

Normalization cannot convert a failed workflow into success. It runs only after the protected child workflow and its domain validator pass, verifies required files and provenance, rejects sensitive metadata and uses static control mappings to prevent arbitrary promotion.

## Consequences

The campaign becomes executable end to end and Recovery can prove REC-01 through REC-10. Provider configuration, protected approvals and human/external evidence remain separate prerequisites.

## Rollback

Revert the registry, manifest schema, dispatcher, normalizer, child workflows, recovery evidence changes, tests and runbook as one unit. Do not restore release eligibility without an equivalent exact-SHA fail-closed path.
