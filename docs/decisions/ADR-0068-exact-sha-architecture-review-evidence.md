# ADR-0068: Generate exact-SHA architecture review evidence

- Status: Proposed
- Date: 2026-07-15
- Scope: Enterprise readiness architecture governance

## Context

The enterprise readiness model contains a control requiring architecture decisions to be recorded. The repository already maintains decision records under `docs/decisions`, but the scorecard had no trustworthy evidence document proving that the inventory existed, followed a consistent contract, and belonged to the exact assessed commit.

A manually authored `Complete` document would be insufficient because it could become stale, omit malformed decision records, or be reused for another SHA. The evidence path also must not store the full contents of every decision, secrets, customer data, credentials, or provider responses.

## Decision

Generate `docs/security/evidence/release/architecture-review.json` inside the Enterprise Readiness Scorecard workflow after checking out the exact assessed SHA.

The generator scans the architecture decision inventory and requires:

- canonical `ADR-NNNN-kebab-case.md` filenames;
- unique ADR numbers;
- a supported status and valid date;
- reviewable Context, Decision, Risks and trade-offs, and Rollback sections;
- a minimum inventory size;
- GitHub Actions provenance for the canonical repository;
- equality between target SHA and the checked-out SHA;
- a numeric workflow run identifier.

The evidence stores paths, metadata, counts, and SHA-256 content digests only. It does not store raw decision bodies.

## Impact

A valid exact-SHA architecture inventory can satisfy the non-critical Engineering architecture-governance control. Malformed or locally generated evidence remains Open and contributes no score.

The scorecard workflow now checks out the exact assessed SHA explicitly, runs focused architecture-evidence tests, builds the evidence, then calculates the score. No production runtime, provider, legal, security-review, recovery, or certification claim is created by this decision.

## Risks and trade-offs

- stricter structure can expose older ADRs that need formatting repairs;
- the inventory threshold requires continued maintenance as the repository evolves;
- a content change alters the aggregate digest and requires fresh evidence;
- repository evidence proves decision hygiene, not that every decision is operationally deployed or independently approved;
- adding one repository-backed control does not materially resolve the remaining runtime and external enterprise blockers.

These costs are accepted because deterministic, exact-SHA evidence is safer than a stale manual architecture review.

## Tests and evidence

Focused tests validate a healthy inventory, deterministic digests, malformed metadata, missing required sections, duplicate decision numbers, exact-SHA provenance, and rejection of local or mismatched runs.

GitHub Actions remains authoritative for lint, TypeScript, unit tests, build, security suites, workflow validation, and scorecard generation on the exact pull-request head.

## Rollback

Revert the generator, focused tests, workflow integration, and this ADR together. The Architecture decisions recorded control will return to `NOT_VERIFIED`. No database migration, customer-data rewrite, credential rotation, provider rollback, or deployment rollback is required.
