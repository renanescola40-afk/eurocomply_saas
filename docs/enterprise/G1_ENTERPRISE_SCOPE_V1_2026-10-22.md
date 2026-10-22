# RISCK COMPLY — G1 Enterprise Scope V1.0

**Date:** 2026-10-22  
**Baseline main SHA:** `70d3545f414d063379d481fd238aed563e05edda`  
**Freeze status:** CANDIDATE on isolated review branch; not yet merged or finally accepted.  
**Machine-readable register:** `config/g1-enterprise-scope-v1.json`.

## Defined offering and boundary
B2B SaaS for AI inventory, assessment, governance decisions, evidence, audit trail, documentation, billing and data/privacy operations using Next.js/Vercel/Supabase/Stripe. This defines *necessary* acceptance for the marketed core, not perfection or external certification. Current legacy Enterprise 100 controls remain independently effective and cannot be silently bypassed by this register.

## Acceptance logic
Every applicable **A** criterion must have current reproducible evidence and a named approving reviewer. A failed/unknown/unverified item counts **0**. No P0 or material unaccepted P1 is compatible with `PASS`. A version update must disclose reason, risk and review, not reclassify a risk to improve the percentage. B is customer-specific, C optional, D requires a reason. The register began with all criteria NOT_VERIFIED; as reproducible exact-SHA provider evidence is reviewed on the isolated G1 branch, individual criteria may be marked PASS without implying full Enterprise release acceptance.

## Mandatory atomic criteria (38)

| ID | Domain | Acceptance criterion | Evidence needed | Dependencies |
|---|---|---|---|---|
| SEC-01 | Security | Session authentication, recovery and logout reject expired/revoked sessions in authenticated browser/API tests | Authenticated run logs, replayable negative session fixtures | — |
| SEC-02 | Security | Every mandatory read and mutation is authorized server-side by active membership and role, including deny tests | Role/permission matrix plus negative API integration evidence | SEC-01 |
| SEC-03 | Security | Tenant A cannot read, mutate, export or download tenant B records via API, RLS and Storage | Tenant A/B authenticated runtime and SQL/RLS/Storage results | SEC-02 |
| SEC-04 | Security | Privileged SQL functions, elevated writers, files and webhooks are restricted to intended principals | Production grants/policy readback and unauthorized-invocation tests | SEC-02 |
| SEC-05 | Security | Secrets never reach client bundles or logs; TLS and at-rest protection are appropriately configured | Secret scanner, deployed configuration attestation, transport/storage checks | — |
| SEC-06 | Security | No known unaccepted material high/critical issue in committed flows; privileged actions have durable audit events | Risk register, vulnerability dispositions, event replay and audit outputs | SEC-02 |
| FUN-01 | Functional product | A legitimate user signs up, authenticates and creates/joins the intended workspace | Authenticated signup/onboarding E2E and durable DB readback | SEC-01 |
| FUN-02 | Functional product | AI inventory create/view/update and risk assessment persist with correct tenant and ownership | Authenticated E2E plus persisted record and isolation evidence | FUN-01, SEC-03 |
| FUN-03 | Functional product | Governance workflow records accountable owner, decision, timestamps, review state and supporting evidence | Multi-role approval/deny E2E and durable audit trail | FUN-02, SEC-02 |
| FUN-04 | Functional product | Evidence uploads/downloads, audit trail, mandatory reporting and document export work with access controls | Authenticated browser/API tests, generated file inspection and data readback | FUN-03, SEC-03 |
| FUN-05 | Functional product | Administration, retention/deletion/export and privacy request workflows fulfill the published offering | Role-specific E2E, data deletion/retention and export evidence | FUN-01, SEC-02 |
| FUN-06 | Functional product | Navigation and actual product contracts match what is marketed; incomplete optional flows are not sold as complete | Release-scoped product route inventory and marketing/contract mismatch review | FUN-01 |
| BIL-01 | Commercial and billing | Publicly committed plans map to existing correctly configured Stripe prices and intended access limits | Redacted Stripe product/price IDs and offer-to-entitlement mapping | — |
| BIL-02 | Commercial and billing | Signed Stripe TEST webhooks reject invalid signatures and replay/duplicates safely | Genuine Stripe test event, webhook delivery IDs and idempotency readback | BIL-01 |
| BIL-03 | Commercial and billing | A genuine test Checkout creates and persists the expected organization entitlement in isolated QA | Exact-SHA Stripe TEST event linked to QA durable DB state and app entitlement | BIL-02, DAT-01 |
| BIL-04 | Commercial and billing | Plan changes, nonpayment and cancellation converge on durable, safe subscription states | Genuine Stripe TEST lifecycle events plus authenticated UI/backend assertions | BIL-03 |
| BIL-05 | Commercial and billing | Access checks and billing modifications are authorized server-side; customer cannot self-grant a paid tier | Negative API tests and tenant-isolated entitlement query evidence | SEC-02, BIL-03 |
| DAT-01 | Database and continuity | An ordered, reconciled and reviewed migration manifest bootstraps isolated QA without version collisions | Approved replay manifest, migration hashes, SQL replay log and schema parity check | — |
| DAT-02 | Database and continuity | Concurrent membership changes and usage quotas preserve critical invariants or fail atomically | Native PostgreSQL concurrent-session tests and repeatable invariant queries | DAT-01 |
| DAT-03 | Database and continuity | High-value decisions, audit-chain and billing state survive transaction failure/retry without untracked divergence | Rollback/atomicity negative cases, constraint assertions and audit-chain validation | DAT-01 |
| DAT-04 | Database and continuity | A bounded isolated restoration proves DB and relevant Auth/Storage/application recovery boundaries | Restore transcript, data integrity diff, Auth/Storage scope and recovery limitation log | DAT-01 |
| DAT-05 | Database and continuity | Production migrations, RLS/FORCE RLS, RPC grants and data boundaries match the approved release | Version-scoped provider SQL readback, function ACL and grant tests | DAT-01, SEC-03 |
| QAT-01 | Quality assurance | Mandatory application/unit/integration and security regression suites complete without failing checks | Exact-SHA test logs and results for full required suites | — |
| QAT-02 | Quality assurance | Real authenticated browser tests cover core user journeys and tenant A/B access denies | Exact-SHA Playwright logs, artifacts sanitized of private data | FUN-04, SEC-03, DAT-01 |
| QAT-03 | Quality assurance | Billing plus error, retries, persistence, cancellations and degraded behavior pass application/runtime E2E | Exact-SHA runtime/Stripe sandbox QA report | BIL-04, DAT-01 |
| QAT-04 | Quality assurance | Test source SHA, build, QA environment and deployed tested artifact are traceable; no synthetic substitution | Signed or otherwise independently verifiable check IDs, exact-SHA provenance | QAT-01, OPS-01 |
| OPS-01 | Production operations | The current production deployment is READY, its exact SHA is known and release acceptance uses that SHA | Live Vercel deployment ID/commit SHA and domain assignment verification | — |
| OPS-02 | Production operations | Protected or equivalently controlled merges/releases require approved review, trustworthy checks and explicit release decision | Readback of native rule enforcement or documented audited equivalent controls | — |
| OPS-03 | Production operations | Public critical routes and an authenticated core workflow pass deployment-specific smoke checks | Runtime smoke results and health/endpoints with exact deployment identity | OPS-01, QAT-02 |
| OPS-04 | Production operations | Production monitoring, alert routing, incident response and support contact operate and are documented | Provider alert check, incident drill, runbook and support route | OPS-01 |
| OPS-05 | Production operations | A governed rollback/recovery exercise verifies safe restore of a known-good release without customer-data mutation | Isolated/staged rehearsal log, rollback target SHA and acceptance record | OPS-01, DAT-04 |
| OPS-06 | Production operations | QA, live, preview and production configuration and credentials stay isolated and fail closed | Environment provenance matrix, safe negative-cross-environment tests | SEC-05, DAT-01 |
| TRU-01 | Legal and customer trust | Operator/contracting entity and software rights are identified and supported by appropriate corporate evidence | Authoritative supplier/ownership records, reviewed identity statement | — |
| TRU-02 | Legal and customer trust | Product terms, privacy notice and applicable DPA are accurate, accessible and reviewed for the target service | Versioned terms/privacy/DPA, legal approver identity, effective dates | — |
| TRU-03 | Legal and customer trust | Subprocessors, retention/deletion, transfers and GDPR role allocation match operating reality | Verified vendor list and data flow, retention schedule and legal/privacy sign-off | TRU-02, FUN-05 |
| TRU-04 | Legal and customer trust | AI Act and independent-assurance marketing statements are scoped, current and do not imply false certification | Fact/legal review checklist and approved claim inventory | TRU-02 |
| TRU-05 | Legal and customer trust | Customer-ready security questionnaire, disclosure/contact route, support and incident commitments are truthful | Evidence-indexed procurement packet, tested contact path and approved commitments | OPS-04, TRU-02 |
| TRU-06 | Legal and customer trust | All legal obligations applicable to the offered scope have a documented qualified acceptance or bounded unresolved decision | Applicable-obligation matrix, legal reviewer conclusions and approved exceptions | TRU-01, TRU-03, TRU-04 |

## B — customer/contract-specific

- **B-01:** SAML/SCIM/SSO or bespoke IdP if specifically contracted
- **B-02:** Regional/dedicated residency or custom hosting
- **B-03:** Customer-specific SLA, 24x7 support and RTO/RPO
- **B-04:** Customer-mandated SOC 2/ISO 27001 or external authenticated pentest
- **B-05:** Custom integration, data-export spec or security assessment
- **B-06:** Public sector sector-specific accreditation, if contracted

## C — optional

- **C-01:** Noncritical cosmetic refinements and expanded UI variants
- **C-02:** Advanced analytics beyond marketed/reporting core
- **C-03:** Kubernetes or multi-cloud for hypothetical future scale
- **C-04:** Broad additional integrations not contracted
- **C-05:** Index tuning without measured material operating impact

## D — demonstrably not applicable to default offering

- **D-01:** Conformity assessment for a customer-operated high-risk AI system: not performed by SaaS supplier unless itself legally assigned such role
- **D-02:** Payment institution authorization: app uses Stripe and does not itself provide regulated payment services
- **D-03:** Medical-device software certification for an offering that is not a medical device

## Earliest safe closure order and current readback

1. **P0-A release control:** currently provider CI check readback shows only CircleCI source/synthetic and Vercel status. Native GitHub main protection is recorded as absent in current PR governance; obtain direct rule readback or approved compensating protection. Do not infer full CI from CircleCI.
2. **P0-B QA:** isolated QA `zrxrrfbllsxtleyxjpsz` currently has **0 public application tables** and **0 applied app migrations**. PR #2559 records duplicate migration identities; do not run an unfiltered replay. Produce a production-ledger-bound, hash-verified and dependency-ordered reviewed manifest before QA schema writes.
3. **P0-C database:** reconcile existing #2556 P0-F counter and audit guards; avoid overlapping implementation or any production write without separate approval.
4. **P0-D/E functional and Stripe:** run authentic tenant A/B Playwright and signed Stripe TEST webhook + durable QA entitlement tests after QA bootstrap.
5. **P0-F/G operations and trust:** inspect runtime, recovery, release approval, privacy/legal/trust evidence with independent legal approval where material.

**Observed on 2026-10-22 (NOT complete acceptance):** main `70d3545f414d063379d481fd238aed563e05edda` matched Vercel READY production deployment `dpl_CmyiHWky6g41su26PE1nyGwwCS1f`. Production Supabase public base/partitioned tables: **115**, all with RLS + FORCE RLS. An older main Enterprise 100 closure JSON has 16 controls; this proposal does not edit or auto-approve any of them.

## Governance of status changes
A criterion becomes PASS only by a reviewed commit updating evidence refs, exact SHA/environment, time and reviewer; evidence must survive independent re-read. The calculation is `PASS A criteria / 38`. Report missing evidence separately from a verified failed test. Record blockers by P0/P1 without inferring exact counts where not exhaustively assessed.

**Current candidate tally (2026-10-22, isolated PR #2563):** **1/38 evidence-accepted (2.63%)** — OPS-01, based on provider readbacks resolving `www.risckcomply.com` to Vercel production deployment `dpl_CmyiHWky6g41su26PE1nyGwwCS1f` (`READY`) on exact current GitHub main SHA `70d3545f414d063379d481fd238aed563e05edda`. The explicit provider evidence is in `docs/enterprise/evidence/G1_OPS01_EXACT_PRODUCTION_DEPLOYMENT_IDENTITY_2026-10-22.json`. Other 37 A criteria remain NOT_VERIFIED. This scope is still candidate on an isolated branch pending governed integration; this number is **not** a production Enterprise 100 PASS.
