# Audit log export and tamper-evidence posture

Status: `EXPORT_IMPLEMENTED / HASH_CHAIN_IMPLEMENTED / WORM_NOT_CLAIMED`.

## Implemented controls

RISCK COMPLY has:

- tenant-scoped audit events;
- transactional chained audit persistence;
- previous-hash / event-hash integrity;
- chain verification;
- RBAC and step-up protected audit evidence-pack export;
- signed export integrity;
- fail-closed export audit persistence;
- offline verification tooling and release checks.

Canonical implementation/evidence includes:

- `src/server/security/audit-chain.ts`;
- `src/server/queries/audit-events.ts`;
- `src/app/api/audit/chain/verify/route.ts`;
- `src/app/api/audit/evidence-pack/route.ts`;
- `src/app/api/audit/evidence-pack/route.test.ts`;
- `docs/security/AUDIT_CHAIN.md`;
- `docs/security/EXPORTS_AND_INTEGRITY.md`.

## Boundary: tamper-evident is not WORM

RISCK COMPLY may describe the current design as a **tamper-evident hash chain with signed evidence export** when the relevant runtime/release evidence is current.

RISCK COMPLY must not claim external WORM storage, legally immutable retention, or independent append-only storage unless such a provider-backed control is actually implemented and evidenced.

## Runtime evidence rule

Repository implementation alone does not prove every production release. Exact-release runtime evidence remains authoritative for production claims. If runtime proof is stale or blocked, classify the claim as implementation-complete but runtime-evidence-pending rather than downgrading the source implementation to “planned”.

## Buyer-safe answer

Enterprise audit evidence export is implemented with tenant scoping, authorization, step-up protection and signed integrity. Audit history is tamper-evident through a hash-chain design. External WORM/immutable storage is not currently claimed.
