# ADR: Enterprise documents, evidence and reporting lifecycle

## Decision

RISCK COMPLY will manage enterprise documents as tenant-scoped records with immutable versions, independent approval, integrity digests, bounded publication states and auditable export jobs.

## Security boundaries

- RLS is enabled and forced on every new table.
- Versions and reviews are append-only for authenticated users.
- Publication requires a SHA-256 digest and a private storage reference.
- Owner and approver must be different users.
- Completed exports require digest, storage path and completion timestamp.
- Runtime evidence contains no customer content, names, tokens, database URLs or signed storage URLs.

## Lifecycle

`draft -> in_review -> changes_required|approved -> published|superseded -> archived`

Invalid transitions fail closed. Published documents cannot exist without independent approval and integrity metadata.

## Evidence boundary

Repository implementation and protected runtime proof demonstrate control design and exact-SHA execution only. They do not establish legal sufficiency, certification, external audit conclusions or correctness of customer-supplied document content.

## Rollback

Revert the migration, lifecycle engine, workflow, validator and tests together. Do not preserve generated evidence after reverting its validation contract.