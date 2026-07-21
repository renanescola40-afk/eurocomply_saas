# ADR: Independent external security assurance boundary

- Status: Proposed
- Date: 2026-07-21

## Context

The enterprise release decision requires independent security assurance. Internal implementation, automated scanners and repository tests are valuable but cannot truthfully substitute for an external review or penetration test.

Without a versioned scope and fail-closed acceptance contract, external reports can become stale, ambiguous, detached from the released commit or promoted despite unresolved severe findings.

## Decision

Introduce a vendor-neutral assurance package that:

- defines required attack surfaces and test classes;
- binds the review to the exact current `main` SHA;
- requires reviewer identity and independence attestation;
- requires a complete finding register and retest state;
- blocks open critical and high findings;
- rejects stale, future-dated, malformed or secret-bearing evidence;
- stores a SHA-256 digest instead of copying report contents into the decision artifact;
- runs only through a protected GitHub environment;
- retains the bounded acceptance decision for one year.

## Consequences

### Positive

- external assurance becomes repeatable and procurement-friendly;
- severe findings cannot be hidden by an aggregate pass flag;
- evidence provenance is tied to the release candidate;
- vendor choice remains open;
- the scorecard can consume one stable acceptance result.

### Trade-offs

- an external assessor and budget remain required;
- material changes can invalidate a prior review;
- the repository cannot independently prove reviewer competence;
- legal and contractual review of the assessor engagement remains human work.

## Rejected alternatives

- Self-attestation as pentest evidence: rejected as non-independent.
- Accepting a PDF upload without structured findings: rejected because severe open findings could be obscured.
- Accepting reviews for any recent commit: rejected because release provenance would be ambiguous.

## Rollback

Revert the seven-file package together. Reversion removes the acceptance mechanism but never converts missing external assurance into a pass.
