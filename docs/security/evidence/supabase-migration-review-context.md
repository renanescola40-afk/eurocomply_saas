# Supabase migration review context

This control enriches a blocked production migration dry-run with metadata-only evidence for human review.

The workflow reads only PostgreSQL catalog metadata from the protected production connection. It does not query customer rows, execute migration SQL, alter migration history, or authorize deployment.

For each unresolved migration file, the generated context records the exact file digest, static SQL signals, named schema objects referenced by the file, and whether those names are present in the captured production catalog.

A catalog-name match is not statement-level schema equivalence. It cannot by itself establish `ALREADY_PRESENT_IN_SCHEMA`, `SUPERSEDED`, `PENDING_DEPLOYMENT`, `ARCHIVE_LEGACY`, or any other migration decision.

Every migration classification remains human-governed and requires explicit reviewer identity, rationale, supporting evidence, deploy-order or replacement evidence where applicable, and the existing protected reconciliation controls.

The generated artifact must retain `acceptedDecisions: 0`, `productionWriteAuthorized: false`, and `productionWritePerformed: false`.