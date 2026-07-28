# ADR: Exact-SHA Restore Drill Evidence Promotion

## Status

Proposed

## Context

Backup settings, restore scripts and runbooks do not prove that recovery works for the release currently deployed. Recovery evidence can also leak credentials or customer data when raw provider output is retained. The Enterprise release process needs a bounded way to promote only sanitized, approved and exact-SHA restore evidence.

## Decision

Use a two-stage model:

1. a provider-aware source workflow performs the real isolated restore drill and uploads one sanitized JSON record;
2. a repository-controlled promotion workflow verifies provenance, current-main SHA, successful source conclusion, completeness, isolation, no production mutation, independent approval, redaction and integrity before emitting a retained `Complete / passed` artifact.

The promotion workflow is read-only and cannot operate Supabase, Vercel or production infrastructure.

## Consequences

### Positive

- stale restore evidence cannot satisfy a later release;
- raw provider output is excluded from retained release evidence;
- every required security and recovery check is explicit;
- provider execution and repository validation remain separate truth domains;
- audit and procurement reviews receive a stable integrity digest.

### Negative

- an owner must configure and execute the provider-side source drill;
- a protected environment approval is required;
- evidence must be regenerated for a new exact-main SHA;
- this control cannot replace an external disaster-recovery assessment.

## Rejected alternatives

- treating a backup-enabled setting as proof;
- accepting screenshots or free-form Markdown as canonical evidence;
- retaining full database dumps in GitHub artifacts;
- promoting evidence from arbitrary branches;
- allowing the promotion workflow to modify production.
