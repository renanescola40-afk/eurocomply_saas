# ADR — Targeted Supabase Live-RLS Proof Migrations

- **Date:** 2026-07-30
- **Status:** Superseded
- **Decision owner:** Security Engineering / Release Engineering
- **Related:** Issues #198 and #1415
- **Superseded by:** governed forward-reconciliation Production promotion followed by promotion-bound live RLS runtime proof

## Historical context

This ADR originally authorized a narrowly scoped, manually dispatched exception that could apply a small allowlisted set of proof-specific SQL before running the live tenant-isolation validator. At the time, Production migration history contained substantial unresolved drift, and unrestricted `supabase db push` was explicitly prohibited.

The temporary exception required exact-main dispatch, deliberate `apply_migrations=true`, a protected database connection, focused contracts, bounded SQL execution and strict privilege validation. It did not authorize arbitrary product migrations, migration-history repair or a general Production push.

That historical exception is now retired.

## Superseding decision

The current repository has a governed forward-reconciliation Production-promotion workflow that owns Production migration writes:

`.github/workflows/supabase-forward-reconciliation-production-promotion.yml`

The current `Supabase Live RLS Validation` workflow is post-promotion runtime evidence only and must not execute migrations or direct proof-specific SQL.

Therefore:

1. `apply_migrations` is not a valid current live-RLS workflow input.
2. The live proof must not receive a database credential for the purpose of applying helper SQL.
3. Any required live-RLS helper or privilege repair must be included in the governed forward migration set.
4. That selected set must pass exact-SHA rehearsal, forward dry-run, bounded Production dry-run and the human Decision Gate before Production promotion.
5. The canonical promotion workflow must revalidate current `main`, bounded S3 evidence and accepted human approval immediately before the Production write.
6. After successful promotion, the live RLS proof requires the exact successful promotion run ID and independently validates its provenance.
7. The live proof binds the Production database project to the runtime API project using a redacted digest and then runs the strict tenant-isolation validator.
8. A missing helper, incorrect privilege boundary or failed live postcondition blocks the proof and returns the release to the governed promotion chain; it never authorizes an inline repair.

## Current security boundary

`public.eurocomply_live_rls_inventory(text[])` remains a controlled schema-security helper, not an application feature. Its effective live boundary must prove:

- no `PUBLIC` execute grant;
- no `anon` execute grant;
- no `authenticated` execute grant;
- controlled `service_role` execution remains available to the proof;
- the function remains `SECURITY INVOKER`;
- the function uses the fixed `search_path` required by the validator.

These properties are validated after the governed promotion, not established by the live-proof workflow itself.

## Production-write boundary

There must be one canonical forward-reconciliation Production writer. The following remain prohibited outside that governed writer:

- direct proof-specific Production SQL application;
- unrestricted `supabase db push`;
- `--include-all`;
- migration-history repair or synthetic ledger insertion;
- treating migration manifest membership as Production-write authorization;
- writing for a stale SHA after `main` has moved.

The manifest truth boundary `productionWriteAuthorizedByConfig=false` remains intentional: configuration can describe the selected set but cannot itself grant Production-write authority.

## Historical decision record

The original 2026-07-30 decision was a temporary exception created to unblock live RLS assurance while broad migration-history reconciliation was incomplete. It required manual exact-SHA execution and direct privilege checks and explicitly did not claim full migration-history reconciliation.

Its planned exit criteria were a reconciled, independently reviewed normal Production migration path and a live proof that no longer needed direct allowlisted SQL application. Those exit criteria have now been met at the workflow-design level by the canonical forward-promotion chain and the promotion-bound, non-migrating live RLS validation workflow.

## Consequences of supersession

- Live RLS assurance can no longer mutate Production.
- Database helper changes must travel through the same reviewed migration path as other Production schema changes.
- Runtime evidence remains exact-SHA and tied to a successful canonical promotion.
- The historical exception remains documented for auditability, but must not be used as current operational instruction.
