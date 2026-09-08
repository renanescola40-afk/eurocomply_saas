# Exact-SHA Supabase RLS evidence promotion

Date: 2026-07-18
Status: Superseded
Superseded by: governed forward-reconciliation Production promotion plus promotion-bound live RLS runtime proof

## Historical context

This ADR established exact-SHA live Supabase tenant-isolation evidence. It moved runtime evidence out of source-code commits and into retained GitHub Actions artifacts, required protected execution, exact-SHA provenance, synthetic fixture cleanup and scorecard-side validation.

The historical design also permitted a manually dispatched `apply_migrations=true` exception for proof-specific database helpers. That mutation exception is no longer part of the current architecture.

## Preserved decisions

The following principles from this ADR remain current:

1. Live tenant-isolation evidence must come from a real target Supabase runtime proof.
2. Repository permissions remain read-only for the proof/evidence path.
3. Evidence is retained as GitHub Actions artifacts rather than committed runtime output.
4. The checked-out release SHA and current protected `main` must remain exact.
5. Canonical evidence is accepted only from the expected workflow/repository/run/SHA provenance.
6. Evidence remains redacted and must not persist credentials, sessions, customer identifiers or raw database connection material.
7. Cross-tenant read/write denial and same-tenant allowed behavior remain runtime assertions, not repository assumptions.

## Superseding mutation boundary

Database migration execution is now completely outside `Supabase Live RLS Validation`.

The sole governed forward Production writer is:

`.github/workflows/supabase-forward-reconciliation-production-promotion.yml`

Any helper or privilege repair needed by the live proof must first pass the canonical forward reconciliation chain, including exact selected bytes, rehearsal, forward dry-run, bounded Production dry-run, Decision Gate, protected Production governance and immediate pre-write `main` revalidation.

Only after that promotion succeeds may `Supabase Live RLS Validation` run. The proof takes the successful exact-SHA promotion run ID as authority, validates its provenance and project binding, and performs no migration or direct SQL repair.

`apply_migrations` is therefore a retired historical input and must not be reintroduced into the live proof.

## Current evidence boundary

The runtime proof uses controlled synthetic fixtures against the configured Production Supabase project. It proves the tenant-isolation operations explicitly exercised by the validator and the live inventory-helper privilege boundary.

It does not independently prove every Enterprise control, including backup restoration, storage isolation, legal review, billing lifecycle, provider acceptance or third-party penetration testing. Those retain separate evidence authorities.

## Failure behavior

A missing successful canonical promotion, stale SHA, project-binding mismatch, missing/invalid helper, failed RLS assertion, incomplete cleanup, invalid provenance, expired artifact or conflicting evidence prevents acceptance.

A schema/helper failure returns the release to the governed forward-promotion chain. The live proof must not repair Production inline.

## Consequences

- There is no longer a migration-capable live-RLS proof path.
- Runtime proof and Production schema promotion have separate responsibilities and evidence.
- Production database writes remain concentrated in one governed forward writer.
- Historical exact-SHA evidence principles remain preserved and strengthened by explicit promotion provenance.

## Historical rollback note

The original ADR described reverting workflow/fetcher/evidence components together. That rollback instruction is historical. Any current change to the live-RLS proof or Production promotion boundary must preserve the single-writer, exact-SHA and fail-closed governance model rather than restoring the retired mutation exception.
