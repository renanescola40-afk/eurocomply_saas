# Cross-Executor Handover Register — V2

**Version:** V2 (2026-10-15)  
**Source baseline:** `main@8a759f883365c2c9652ff12e98099db77dd4c59d`  
**Maintainer:** RISCK COMPLY internal buyer-diligence controller  
**Classification:** INTERNAL — NO BUYER RELEASE  
**Status:** documentary source-level review; no runtime, legal or third-party acceptance implied.

| Executor/workstream | Evidence already present at baseline | Observed state | Needed handover evidence | Dossier handling |
|---|---|---|---|---|
| Technical diligence | `docs/due-diligence/VALIDATION_AND_BUYER_ACCEPTANCE_V2.md`, `docs/due-diligence/BUYER_HANDOVER_AND_EVIDENCE_CLOSURE_V3.md`; merged PR #2458 | IMPLEMENTED/documented only; independent 12/12 acceptance **not** shown | Exact tested SHA, commands, exit codes, route/asset/schema coverage, safe local tenant tests, exceptions | RESTRICTED_LATE_STAGE, OPEN |
| Security | `docs/security/dataguard/EXTERNAL_ASSURANCE_RECONCILIATION_V1_4.md`; merged PR #2459; `docs/security/supabase-closure-2026-10-15-phase2-acl.md` | Historical 2026-09-12 external assessment documented, terminal clean retest not evidenced; direct grants metadata checks not full authorization proof | Assessor report provenance/scope, final independent retest, negative RLS/RPC tests, exact runtime SHA, secret-safe summary | RESTRICTED_LATE_STAGE, OPEN |
| M&A / IP | `docs/ma-diligence/RISCK_COMPLY_MA_IP_ASSET_PERIMETER_V3_GATES_2026-10-14.md`; `docs/ma/buyer-materials/RISCK_COMPLY_TRANSACTION_PERIMETER.md` | Title/creator-to-seller assignment OPEN; offline manifest tool draft not executed in the cited review | Executed assignments, contributor/OSS/license and asset provenance, exact-SHA hashed asset inventory, counsel position | NDA_REQUIRED / LEGAL_EXECUTED not established |
| Demo-safe runtime | `docs/assurance/iso27001-soc2/exact-sha-production-drift-2026-10-15.md`; `10_RUNTIME_EVIDENCE/RUNTIME_EVIDENCE_REQUEST.md` | Dated source/deployed SHA divergence; not refreshed live here | New authorized read-only deployment snapshot, parity comparison, CI/results on deployed commit, scoped smoke evidence | RESTRICTED_LATE_STAGE, NO DEPLOY |
| Commercial/legal/finance | `docs/ma-diligence/M_AND_A_REQUIREMENT_STATUS_MATRIX.md` | Historical 37/98 evidence; not current buyer conclusion | Corporate authority/official records, executed IP and DPA, accounting/tax originals, provider permissions, written buyer acceptance | HOLD |
| Active security PR | GitHub PR #2477, OPEN as inspected 2026-10-15 | Proposed key-validation hardening not credited as completed | Review, CI, disposition, exact baseline refresh | INTERNAL, monitor conflict on base changes |

## Handover packet contract
Accept any executor output only with `owner; evidence_path_or_secure_reference; source_SHA; tested/deployed_SHA_if_applicable; UTC_timestamp; scope; commands_or_primary_issuer; reproducible_PASS_FAIL; disclosure_tier; outstanding_limitations; reviewer`. A prose statement or historical percentage alone is insufficient. Conflicting results remain OPEN.

## Integration order
1. Freeze new working SHA and review concurrent open PRs; do not merge.
2. Collect technical/source, security and runtime output without touching demo or production.
3. Link IP/title and accounting documents by secure off-repository references, not uploaded secrets.
4. Recompute item-level evidence matrix only after accepted primary documents.
5. Owner approves named disclosure and recipient, NDA/access tier, security and legal redaction.
6. A separately authorized team may execute any closing or transfer; this pack grants no such permission.

**Outcome:** Cross-executor source-discovery and dependency handoff documented, not independently completed all four evidence streams. No external message, secret or live action.
