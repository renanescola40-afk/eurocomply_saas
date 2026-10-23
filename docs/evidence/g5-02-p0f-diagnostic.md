# G5-02: P0-F read-only counter diagnostic

Source base commit: `acf2f5e477e912064fd3a9cab47094e9401148c4`.

This addition is **diagnostic only**. It intentionally makes no schema, data, permission, migration, or deployment changes.

Execute `psql -X -v ON_ERROR_STOP=1 -f scripts/diagnostics/g5-02-p0f-drift-readonly.sql` with a **read-only database role**. It aggregates counts only, returning no tenant identifiers or customer records.

At 2026-10-23, the directly executed equivalent on PROD returned: missing usage = 1; member mismatch = 2; admin mismatch = 2; union = 3. PROD had 266 organizations, 265 usage rows and 137 migration ledger entries. QA had 6 ledger entries and 115 public tables. These values are observation snapshots, **not acceptance evidence** for DAT-01 through DAT-05.

**Important:** the current calculation counts `status='active'` and `role IN ('owner','admin')`. Confirm that this matches the authoritative counter maintenance algorithm and seat classifications before using any result as the P0-F source-of-truth. Missing usage may overlap with other counter discrepancies. It is not permissible to run a repair on the basis of these aggregate results alone.

## Required remaining proofs
1. Match each of 137 production ledger versions and its ordered, canonical source SQL, retaining hashes and original file paths.
2. Replay these migrations on disposable PostgreSQL 17.6 and record the first failing version with SQLSTATE.
3. Validate member/seat/admin/last-owner invariants under concurrent native PostgreSQL sessions and rollback/failed audit-chain append.
4. Verify app callsites have cut over to audited atomic RPC variants, without retiring legacy functions prematurely.
5. Exercise isolated logical restore and compare relevant schema, policies, permissions and application persistence; document Auth, Storage and secret recovery separately.
6. Build a reviewed, targeted, reversible transaction for any genuine P0-F drift; obtain specific approval **before** persistent production SQL; read back drift zero before closing #2527.

No gates are formally PASS by this diagnostic; no PR merge is authorized.
