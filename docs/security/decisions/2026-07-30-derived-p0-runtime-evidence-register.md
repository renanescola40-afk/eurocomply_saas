# ADR — Derived P0 Runtime Evidence Register

- **Date:** 2026-07-30
- **Status:** Superseded on 2026-08-04
- **Decision owner:** Release Engineering / Security Engineering
- **Superseded by:** `docs/architecture/decisions/2026-08-04-generated-p0-runtime-register.md`

## Historical decision

This ADR introduced a shared runtime evaluator and a derived Markdown/JSON register to detect overclaims and underclaims in the manually maintained P0 register.

The design improved runtime validation but retained two weaknesses:

1. repository-only controls inherited their committed Markdown status instead of being recalculated from the exact checkout;
2. `--write-register` allowed a moving release snapshot to replace the versioned policy file.

It also produced a separate artifact schema and location, creating two potential P0 status formats.

## Superseding decision

The 2026-08-04 ADR replaces the renderer with one exact-SHA source of truth:

- versioned Markdown is policy metadata only and remains fail-closed `Open`;
- runtime status comes exclusively from canonical validators;
- repository controls are recalculated from `package.json` and `package-lock.json`;
- JSON and Markdown are immutable workflow artifacts;
- an independent semantic validator checks totals, decision, SHA and integrity digest;
- no workflow can write current status back into the policy file.

The legacy script and tests were removed to prevent competing formats. Historical artifacts remain valid only for the SHA and semantics under which they were generated; they must not be treated as current release proof.
