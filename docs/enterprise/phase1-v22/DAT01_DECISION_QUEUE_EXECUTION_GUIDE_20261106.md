# DAT-01 — provenance review decision queue (non-executable)

This is a **decision-support deliverable**, not a migration repair, source-byte attestation, or formal Enterprise gate acceptance. It uses the existing 137-row frozen provider-ledger manifest, historical GitLab candidate map, and documented provider-statement subspan comparisons. It executes **no SQL**, has **no database/network clients**, and cannot approve a replay.

## Commands (Node 22; no dependencies required)

Focused tests, repository root:

    node --test tests/diagnostics/dat01-provenance-decision-queue.test.mjs

Regenerate and inspect the review queue:

    node scripts/diagnostics/dat01-provenance-decision-queue.mjs > /tmp/risck-dat01-review-queue.json

The checked-in JSON at docs/enterprise/phase1-v22/DAT01_PROVENANCE_REVIEW_DECISIONS_20261106.json must equal the generator output when parsed as JSON. Tests detect drift.

## Boundaries

- **137** provider ledger identities retain their original order, frozen joined SHA-256, byte count, and statement count.
- **34** lack verified original whole-file source bytes; **25** have nonexact version mappings. **11** overlap, yielding **48 distinct review cases**.
- **8** immutable historical files contain exact provider-statement subspans. None qualifies as an authenticated original whole-file source.
- **2** historical file renames have been traced, but actual original applied SQL provenance is unresolved.
- **2** consolidation groups preserve **two distinct provider versions each**. No collapsing replay decision is made.
- The migration 20260726070000 retains a specific RLS historical drift warning: an earlier applied permissive policy differs from a later auth.uid()-gated source. Do **not** replace historical applied SQL with current source.
- There are **zero** approved replay rows, **zero** qualified executable manifests, and **zero** approved ordered PostgreSQL 17 historical replays. A-12 / DAT-01 = BLOCKED.

## Required independent decisions

For each case, a qualified independent reviewer must decide source-byte provenance or a documented exception; separately validate any nonexact version mapping and order. The reviewer must resolve RLS security semantics and both consolidation groups before approving a replay strategy. A later explicitly authorized, isolated PG17 QA replay and reviewer-signed evidence are separate prerequisites. A unit test, historical Git candidate or exact SQL statement subspan alone does not suffice.

The queue has no raw SQL and cannot be made executable by renaming it. An executable plan must be a **new, independently governed artifact**.

**Integration:** stacked on existing GitHub PR #2603 branch phase1/security-dat01-v22, reusing historical evidence without duplicating research. No merge, main write, provider CI spoofing, database mutation, email or paid job was performed.
