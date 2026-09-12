# RISCK COMPLY — Enterprise Terminal Closure Controller V1

Date: 2026-09-12  
Mode: `ENTERPRISE_TERMINAL_CONTROL`  
Target: Big Tech / bank / insurance / government procurement  
Status: `NO_GO / TERMINAL_EVIDENCE_INCOMPLETE`

This controller is evidence-first. It does not treat internal preparation as a substitute for third-party assurance, qualified legal review, fiscal acceptance, a legitimate live customer lifecycle, or exact-SHA Production proof.

## Canonical weighting

| Lane | Weight | Current lane completion | Weighted contribution | Terminal state |
| --- | ---: | ---: | ---: | --- |
| Technical / Production | 30 | 58% | 17.4 | OPEN |
| Security / Assurance | 25 | 48% | 12.0 | OPEN |
| Legal / Privacy / AI Act | 20 | 48% | 9.6 | OPEN |
| Commercial / Billing / Fiscal | 15 | 57% | 8.6 | OPEN |
| Procurement / Operations | 10 | 85% | 8.5 | PARTIAL |
| **Enterprise strict** | **100** |  | **56.1%** | **NO PASS** |

Rounded canonical score: `ENTERPRISE_STRICT=56%`.

The prior management estimate of approximately 82% is superseded for terminal-control purposes. The reduction is an evidence reclassification, not a claim that source engineering regressed. The previous estimate materially over-credited internal preparation, pre-assessment assumptions and a historical Supabase closure assumption that fresh Production inspection does not support.

## Current release facts

- GitHub protected `main` observed at controller start: `7ad578b7ed4224a2b4348c448492332c2313ad12`.
- Canonical Vercel Production deployment observed: `dpl_BznNuFKG8UEh4yW8y9HQyzLXDiJ9`.
- Production Git SHA observed: `13b19410caa20045b19d98d58df406c43433af5a`.
- `main` is 118 commits ahead of the Production SHA at this snapshot.
- `/api/health` returned HTTP 200 during the fresh audit.
- Exact-current-main Production acceptance is therefore not proven.

Do not reinterpret a healthy endpoint as exact-SHA acceptance.

## Supabase Production reconciliation

Fresh Production migration-history inspection shows the remote ledger head is:

`20260909232229_finalize_backend_only_force_rls_and_trigger_acl`

The four reviewed V43 forward migrations present on current source are not present in the Production migration ledger:

- `20260910113000_reconcile_fria_operational_runtime_v43.sql`
- `20260910113500_article5_policy_replay_compatibility_v43.sql`
- `20260910114000_reconcile_prohibited_practices_runtime_v43.sql`
- `20260910115000_atomic_data_subject_request_lifecycle_audit_v43.sql`

Direct Production inspection also did not find the V43 Article 5 prohibited-practice relations/RPCs or the V43 atomic DSR audit RPC expected by the reviewed forward package.

Therefore:

- `V43_PRODUCTION_PROMOTION=NO_PASS`
- `ARTICLE5_V43_RUNTIME=NO_PASS`
- `GDPR_DSR_ATOMIC_V43_RUNTIME=NO_PASS`
- `FRIA_V43_RECONCILIATION=NO_PASS`

Existing FRIA base tables and broad RLS posture remain real evidence, but they do not substitute for the missing V43 forward contract.

No database write is authorized or performed by this Legal/Procurement controller. Promotion belongs to the canonical Technical/Supabase release lane.

## Canonical control matrix

| CONTROL | OWNER_LANE | STATUS | EVIDENCE | BLOCKER | NEXT_ACTION | WEIGHT_NOTE |
| --- | --- | --- | --- | --- | --- | --- |
| Source/release hygiene | LANE_1_TECHNICAL | PASS_SIGNAL | no open PR; no open P0/P1 issue observed at audit start | exact-current-main CI/Production evidence still separate | preserve one canonical release lineage | technical only |
| Exact SHA Production | LANE_1_TECHNICAL | OPEN | main and Production SHA differ materially | 118-commit drift at audit snapshot | close security/legal blockers, freeze one final SHA, deploy once, independently verify | no double count with release provenance |
| Supabase Production / RLS | LANE_1_TECHNICAL | PARTIAL | Production project healthy; public base tables inspected with RLS and FORCE RLS enabled; sampled service-only tables fail closed to anon/auth | Production ledger stops at V42-era head; reviewed V43 forward set absent | canonical Technical lane performs governed V43 promotion and postconditions | technical only |
| Article 5 / FRIA / DSR V43 | LANE_1_TECHNICAL | NO_PASS | source contains reviewed V43 forward migrations; Production ledger/runtime does not contain the complete V43 contract | missing governed Production promotion | promote via canonical protected path, then verify exact postconditions | technical only |
| Tenant isolation runtime | LANE_1_TECHNICAL | PARTIAL | RLS/FORCE RLS posture is strong | fresh authenticated two-tenant/role matrix required | run exact-SHA authenticated tenant-isolation matrix after release freeze | technical only |
| Production runtime | LANE_1_TECHNICAL | PARTIAL | public health 200; historical readiness dependency timeouts observed in runtime telemetry | protected readiness and sustained exact-SHA runtime proof incomplete | prove readiness and critical flows on final deployment | technical only |
| External automated black-box assessment | LANE_2_SECURITY | REPORT_RECEIVED_REMEDIATION_OPEN | attributable confidential external report completed 2026-09-12; digest retained outside public report content | release-blocking findings remain; no clean retest | remediate, retest, retain attributable closure | security only |
| Independent terminal security assurance | LANE_2_SECURITY | OPEN | preparation and external automated evidence exist | clean retest and any procurement-required human/manual scope remain unresolved | finish retest; obtain additional independent scope if buyer standard requires it | security only |
| Qualified Legal 8/8 | LANE_4_LEGAL_PROCUREMENT | `0/8_ACCEPTED` | eight review workstreams prepared for external review | no attributable accepted qualified decisions | use legitimate no-cost qualified-review routes; retain reviewer identity/scope/decision | legal only |
| Master Legal Opinion | LANE_4_LEGAL_PROCUREMENT | OPEN | handoff/package prepared | upstream 8/8 not accepted | obtain bounded attributable conclusion only after valid upstream review | legal only |
| Owner legal decisions | LANE_4_LEGAL_PROCUREMENT | PASS_INTERNAL | owner Legal Package V1 approved; 12/12 owner commercial decisions closed | does not replace counsel | keep bound to final reviewed package | legal only |
| GDPR / Privacy final | LANE_4_LEGAL_PROCUREMENT | PARTIAL | public/review surfaces and operational controls exist | qualified final role/basis/retention/transfer acceptance remains open; V43 DSR runtime is also not promoted | Technical lane closes runtime; Legal lane closes qualified conclusions | legal/technical split; no double count |
| Seller identity / registry | LANE_3_BILLING + LANE_4_LEGAL | PARTIAL | operator/contracting entity owner decision closed | current authoritative registry/tax evidence not present in connected evidence set | obtain current authoritative registry/tax proof before final signature/publication | split factual boundary; do not double count |
| Stripe LIVE authority | LANE_3_BILLING | STRONG_PARTIAL | canonical LIVE products/prices and enabled signed-webhook endpoint observed | no legitimate LIVE customer lifecycle yet | preserve config; prove lifecycle with first legitimate customer | billing only |
| VAT / fiscal acceptance | LANE_3_BILLING | OPEN | LIVE Tax registrations observed as zero; active prices inspected use unspecified tax behavior | seller regime/registrations and end-to-end tax treatment not accepted | reconcile with authoritative seller tax facts and accountant/authority where needed | billing only |
| Legitimate paying customer | LANE_3_BILLING | EXTERNAL_CUSTOMER_DEPENDENT | zero LIVE customers/subscriptions/invoices observed at audit | no genuine customer transaction exists to use as evidence | first legitimate purchase: checkout → signed webhook → subscription → invoice → entitlement/lifecycle evidence | billing only |
| Trust Center truth | LANE_4_LEGAL_PROCUREMENT | PATCH_PREPARED | source previously said no third-party assessment report existed | production still serves older release until governed deploy | merge truthful bounded copy; deploy only through final release lane | procurement only |
| Procurement packet | LANE_4_LEGAL_PROCUREMENT | RECONCILED_INTERNAL | packet/checklist/security/privacy materials updated to current evidence | terminal upstream assurance incomplete | keep release-bound before buyer sharing | procurement only |
| Final data room index | LANE_4_LEGAL_PROCUREMENT | PASS_INTERNAL_INDEX | current controlled index created with confidential-artifact references/digests only | buyer-specific sharing/acceptance remains external | keep index release-bound and current | procurement only |

## Security evidence confidentiality

The external security report is confidential. The report itself, reproduction details, endpoint-level findings and exploit guidance must not be committed to this public repository.

Publicly retain only bounded metadata needed for truth and provenance. Canonical confidential artifact reference for the 2026-09-12 report:

- SHA-256: `5a71077f20000047a5d5b3b2865e5ba13760683cf1052a2f0e69326aa37ff281`
- report content: controlled external artifact; not public repository material
- state: `REMEDIATION_AND_RETEST_OPEN`

## Terminal blocker set

Enterprise 100 remains prohibited until all of the following are true on one accepted release lineage:

1. V43 Production promotion/postconditions are green, `EXACT_SHA=PASS` and final Production/runtime proof is green.
2. Security remediation is complete and required independent retest/assurance is accepted with no release-blocking Critical/High findings.
3. `LEGAL_8_OF_8=8/8_ACCEPTED_OR_VALID_NA` and `MASTER_LEGAL_OPINION=PASS`.
4. VAT/fiscal treatment is accepted from authoritative seller facts and the first legitimate LIVE lifecycle is proven when available.
5. Procurement/Trust Center/data-room materials are bound to the final accepted release and disclose only current truth.

## Hard decision

`ENTERPRISE_100=NO_PASS`  
`PRODUCTION_GO=NO_GO`

No internal document, AI analysis, owner approval, scan, generated evidence bundle or historical tracker may override these terminal evidence gates.
