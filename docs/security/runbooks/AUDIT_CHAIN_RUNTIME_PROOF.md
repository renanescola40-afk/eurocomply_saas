# Audit Chain Runtime Proof

## Purpose

`Audit Chain Runtime Proof` is the protected exact-SHA production proof for the tamper-evident audit chain. It validates the live Supabase schema and transactional append RPC, exercises concurrency, verifies chain integrity and tamper detection, then removes every synthetic fixture created by the proof.

The proof runs automatically on every protected `main` SHA and can also be dispatched manually for recovery. A workflow run is acceptable to P0 only when it is successful, bound to the exact current `main` SHA and produces the uniquely named exact-SHA artifact.

## Protected inputs

The workflow requires only production control-plane credentials/configuration that are intrinsic to the control:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUDIT_CHAIN_SIGNING_SECRET`
- `EVIDENCE_PACK_SIGNING_SECRET`

It does **not** require persistent test organization IDs, actor IDs, synthetic user emails or passwords.

## Disposable fixture model

The proof creates temporary owner/member/outsider identities and two temporary organizations using the same hardened helper used by the Auth/RBAC live proof. The audit-chain transaction test uses the temporary owner and organization A.

The proof creates only synthetic audit events with action:

`security.audit_chain_live_validation`

Synthetic payloads are never copied into the evidence artifact.

## Live acceptance criteria

The protected run must prove all of the following in one transactionally coherent execution:

1. required audit-chain source contracts and migrations exist;
2. the target `audit_events` chain columns are live;
3. `append_audit_event_chained` accepts a normal append;
4. two concurrent appends against the same previous hash produce exactly one winner;
5. retry against the fresh previous hash succeeds;
6. readback chain verification succeeds;
7. metadata tampering produces an event-hash failure;
8. a broken previous hash is detected;
9. verify/export code remains protected by RBAC + Step-Up;
10. evidence-pack signing configuration is present;
11. all synthetic audit rows are removed;
12. all temporary memberships, organizations and users are removed;
13. cleanup absence is verified before the evidence may be Complete.

## Cleanup boundary

Cleanup is part of the security proof, not best-effort housekeeping.

The script first deletes the exact synthetic audit-event IDs created by the run and verifies that none remain. It then invokes the shared ephemeral Auth/RBAC fixture cleanup and verifies that memberships, organizations and Auth users are absent.

If either cleanup phase cannot be verified, the live proof is `Failed`, `ephemeralFixtureCleanup` is false and enterprise release evidence remains fail-closed.

## Evidence safety

The raw and canonical evidence must not contain:

- Supabase credentials;
- audit/evidence signing secrets;
- temporary passwords;
- full user or organization IDs;
- raw audit payloads;
- raw database/provider error messages;
- retained synthetic audit events.

Only booleans, counts, bounded hash prefixes, stable failure codes and exact GitHub provenance are allowed.

## P0 handoff

`scripts/enterprise/fetch-audit-chain-runtime-evidence.mjs` accepts successful `push` or `workflow_dispatch` runs only when:

- workflow path is exactly `.github/workflows/audit-chain-runtime-proof.yml`;
- branch is `main`;
- `head_sha` equals the assessed SHA;
- the artifact name is exactly `audit-chain-runtime-proof-<SHA>` and is unique;
- raw live validation and cleanup pass;
- canonical exact-SHA provenance passes the authoritative validator.

Never edit the evidence JSON by hand to convert a failed or incomplete proof into `Complete`.
