# Counsel Confidentiality, Professional Secrecy and Privilege Protocol

**Status:** `REVIEW_DRAFT` · `COUNSEL_DECISION_REQUIRED`

## Purpose

This protocol defines how Risck Comply should prepare, transfer, store and reference legal-review material without assuming that use of software automatically creates privilege or professional secrecy.

## Information classes

### Public preparation

May be stored in the repository when it contains no secrets, personal identification documents, customer-confidential data or legal advice:

- product descriptions;
- public legal sources;
- article-to-evidence maps;
- non-confidential test evidence;
- blank decision templates;
- safe package manifests and digests;
- public claims and review drafts.

### Restricted product material

Must be accessible only to authorised Platform staff and assigned Counsel:

- non-public architecture details;
- vulnerability information;
- security findings;
- unreleased roadmap;
- internal pricing and strategy;
- unredacted production evidence;
- customer identifiers.

### Counsel-confidential material

Must not be committed to a public repository:

- engagement records;
- conflict results;
- professional identification documents;
- signed opinions;
- legal advice;
- customer legal strategy;
- unredacted findings;
- communications marked confidential or privileged;
- customer-specific assessments.

### Highly restricted evidence

Requires explicit need, minimum access, audit and retention controls:

- special-category data;
- employee or affected-person case files;
- incident evidence;
- credentials or authentication material;
- regulator communications;
- litigation material.

## Storage rules

1. Public Git stores only safe preparation documents and immutable references.
2. Signed decisions are stored in an approved private evidence location.
3. The repository stores only:
   - signed artifact reference;
   - SHA-256 digest;
   - reviewer identity fields required by the gate, where safe;
   - review dates, scope and status.
4. Private storage must enforce tenant scope, reviewer scope, least privilege and revocation.
5. Download links must expire.
6. Sensitive responses must use no-store controls.
7. Access and downloads should create audit events.
8. Credentials, raw tokens and full identification documents must never appear in logs or public artifacts.

## Communications

Preferred order:

1. restricted review portal;
2. approved encrypted file exchange;
3. secure professional email where appropriate;
4. ordinary email only for non-confidential coordination.

Do not send signed opinions, identity documents or customer datasets through public issue comments, pull requests or unprotected links.

## AI handling

AI-assisted preparation may process only material authorised for that purpose.

Before sending counsel or customer-confidential material to an AI provider, verify:

- contractual role;
- data-use and training settings;
- retention;
- region and transfer mechanism;
- access controls;
- subprocessors;
- deletion options;
- whether privilege or professional secrecy could be affected.

Where those facts are not confirmed, use redacted or synthetic material.

AI may summarise and organise. AI may not create a counsel decision or signature.

## Privilege notice

Privilege depends on applicable law, purpose, participants, client relationship and handling. The Platform does not guarantee privilege.

Counsel should decide:

- which documents are legal advice;
- who may receive them;
- how they should be labelled;
- whether the Platform may retain them;
- whether disclosure to providers affects protection;
- what must be preserved or deleted.

## Reviewer access

Reviewer access must be:

- assigned to a named verified reviewer;
- limited to the accepted scope;
- time-limited;
- revocable;
- protected by MFA or step-up when required;
- blocked after expiry or revocation;
- separated from preparation and approval roles;
- logged without storing confidential content in audit metadata.

## Evidence references

A public evidence reference should contain only:

- artifact identifier;
- storage class;
- product SHA;
- evidence digest;
- decision digest;
- review dates;
- scope;
- safe reviewer details required for validation;
- status.

It should not contain the full opinion unless disclosure is approved.

## Incident response

A suspected disclosure of legal-review material requires:

1. access revocation;
2. evidence preservation;
3. incident classification;
4. Counsel notification;
5. customer notification assessment;
6. data-protection assessment;
7. privilege-impact assessment;
8. remediation and post-incident review.

No public incident statement should expose legal strategy or security-sensitive details.

## Retention and deletion

Retention must distinguish:

- engagement and professional records;
- signed legal decisions;
- customer workspace data;
- technical evidence;
- audit evidence;
- billing and tax records;
- superseded drafts.

Deletion must not silently destroy evidence subject to legal hold, professional retention or audit integrity. Counsel and the customer must determine applicable retention duties.

## Exit

When a review or partnership ends:

- revoke access;
- export authorised customer material;
- return or delete confidential data as agreed;
- preserve only required records;
- remove public partnership claims;
- mark decisions expired or superseded when required;
- retain immutable digests for historical integrity without retaining unnecessary confidential content.

## Counsel decisions required

Counsel must confirm:

- whether the proposed storage model is acceptable;
- legal privilege limitations;
- professional secrecy requirements;
- required retention;
- permitted AI processing;
- cross-border transfer conditions;
- identity evidence handling;
- customer consent or notice requirements;
- incident escalation and regulator duties.