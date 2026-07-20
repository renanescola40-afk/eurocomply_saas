# Data governance evidence contract

Canonical evidence:

`docs/security/evidence/runtime/data-governance-validation.json`

Evidence may be `Complete/passed` only when:

- execution occurred in protected GitHub Actions on exact `main`;
- the SHA is a full 40-character commit SHA;
- the explicit confirmation matched;
- residency region is declared in a structured region format;
- retention is a bounded integer between 1 and 3650 days;
- export encryption is required;
- all three governance tables exist;
- RLS is enabled on every governance table;
- tenant membership and admin policies exist;
- minimization and lifecycle constraints exist;
- data-subject requests have the 30-day due default;
- audit-integrity checkpoints enforce SHA-256 digest shape;
- no failures remain.

Canonical evidence must not contain:

- database connection strings;
- query result rows;
- names or email addresses;
- subject or customer identifiers;
- export payloads;
- tokens, cookies or authorization headers;
- legal-request attachments.

Repository code and documentation do not prove operational completion of a request. Promotion requires the protected runtime proof on the exact merged SHA and strict validator acceptance.
