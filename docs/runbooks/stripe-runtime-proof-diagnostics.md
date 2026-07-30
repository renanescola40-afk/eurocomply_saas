# Stripe runtime proof diagnostics

## Purpose

The Stripe Entitlement Runtime Proof must fail closed while still retaining a sanitized explanation of the failed controls. A red workflow without a check matrix is not actionable evidence.

## Artifact contents

Every run that reaches the proof builder should retain:

- `proof.json` — detailed sanitized runtime checks;
- `evidence.json` — promotion-compatible exact-SHA evidence contract;
- `summary.md` — bounded operator-readable PASS/FAIL matrix.

The raw PostgreSQL catalog is deleted before finalization and must never be uploaded.

## Failure handling

1. Open the workflow summary and read the failed control names.
2. Download the retained artifact only when deeper sanitized inspection is needed.
3. Correct the database/runtime condition rather than changing expected values to make the proof pass.
4. Start a new workflow run when the exact `main` SHA changes.

The final enforcement step remains red whenever either the proof builder or the post-cleanup finalizer fails.

## Promotion boundary

A complete single-delivery runtime proof produces `evidence.json`, but it does not by itself prove duplicate-delivery safety. Stripe evidence promotion additionally requires a genuine `replay.json` produced from an observed replay of the same event. Replay safety must not be inferred or fabricated.

## Truth boundary

This proof covers one observed Stripe test-mode event, one organization and one exact release SHA. It is not a certification, legal opinion, load test, contract approval or guarantee about future events.
