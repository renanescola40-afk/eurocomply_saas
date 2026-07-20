# Incident Response and Continuity Evidence Contract

## Canonical artifact
`docs/security/evidence/runtime/incident-continuity-validation.json`

## Required provenance
- exact 40-character `main` SHA;
- GitHub Actions run identifier;
- protected manual workflow execution;
- explicit confirmation phrase.

## Required controls
- incident, timeline and continuity tables present;
- forced RLS enabled on all tables;
- complete CRUD policy coverage;
- severity lifecycle constraints;
- SHA-256 evidence-integrity constraints;
- bounded SEV1 acknowledgement target;
- bounded SEV1 containment target;
- tabletop freshness requirement;
- reviewed on-call rotation;
- reviewed notification matrix.

## Prohibited material
The artifact must not contain:
- database connection strings;
- incident titles or narratives;
- customer or employee identifiers;
- timeline content;
- evidence payloads;
- tokens, cookies or authorization headers;
- provider responses.

## Promotion rule
No control is promoted merely because code or migrations exist. Promotion requires a `Complete/passed` artifact for the exact integrated `main` SHA and independent review of every protected attestation.

## Non-claims
This evidence does not prove that a real incident was contained, that legal deadlines were met, that customers were notified correctly, or that production RPO/RTO targets were achieved.
