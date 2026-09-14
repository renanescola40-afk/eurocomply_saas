# RISCK COMPLY — Enterprise Terminal Closure Controller V2

Date: `2026-09-14`  
Mode: `ENTERPRISE_TERMINAL_CONTROL`  
Target: Big Tech / bank / insurance / government procurement  
Status: `NO_GO / TERMINAL_EVIDENCE_INCOMPLETE`

This controller supersedes `ENTERPRISE_CLOSURE_CONTROLLER_V1_2026-09-12.md` for current-state decisions while preserving V1 as a historical snapshot. It is evidence-first: internal preparation, owner decisions, automated checks and repository artifacts do not substitute for external assurance, authoritative fiscal facts or exact-release Production proof where those are required.

## Current release authority

- protected `main`: `77f1c37128f8b8e2918a754f56b1789ff0fc2b36`
- canonical Vercel Production deployment observed: `dpl_BznNuFKG8UEh4yW8y9HQyzLXDiJ9`
- canonical Production Git SHA observed: `13b19410caa20045b19d98d58df406c43433af5a`
- canonical Production state: `READY / production`
- `EXACT_SHA_PRODUCTION=NO_PASS`

The public application being healthy is not exact-current-main evidence. Production remains on an older accepted deployment until the protected `Vercel Production Deploy` workflow successfully deploys and verifies the exact current `main` SHA.

## Supabase V43 reconciliation — materially advanced since V1

Fresh read-only Production inspection on `2026-09-14` shows all four reviewed V43 forward migrations in the Production migration ledger:

1. `20260910113000_reconcile_fria_operational_runtime_v43`
2. `20260910113500_article5_policy_replay_compatibility_v43`
3. `20260910114000_reconcile_prohibited_practices_runtime_v43`
4. `20260910115000_atomic_data_subject_request_lifecycle_audit_v43`

Therefore the V1 statement that Production stopped before V43 is superseded.

Current classification:

- `V43_LEDGER=4/4_APPLIED`
- `V43_PRODUCTION_PROMOTION=PASS_OBSERVED`
- `ARTICLE5_V43_RUNTIME_OBJECTS=PRESENT`
- `FRIA_V43_RUNTIME_OBJECTS=PRESENT`
- `GDPR_DSR_ATOMIC_V43_RPC=PRESENT`
- sampled relevant V43/data-subject tables: `RLS=ENABLED`, `FORCE_RLS=ENABLED`
- Issue `#2078`: `CLOSED / COMPLETED`
- Stage 4 human item review: received
- distinct independent Stage 4 approval: received
- Stage 5 governed Production promotion: completed

This does **not** by itself close exact-SHA application acceptance, authenticated tenant isolation, role-matrix runtime proof or final release lineage. Those remain release-bound postconditions.

## External security reconciliation

A confidential attributable third-party black-box assessment completed on `2026-09-12`. Public-safe controlled artifact digest:

`sha256:5a71077f20000047a5d5b3b2865e5ba13760683cf1052a2f0e69326aa37ff281`

The two original release-blocking High findings concerned TLS 1.0 / TLS 1.1 acceptance at the edge. Subsequent owner/provider evidence and independent external TLS validation support that the technical configuration has been remediated:

- Cloudflare minimum TLS configured to TLS 1.2;
- external TLS validation supports rejection of the old protocol versions;
- Qualys SSL Labs evidence recorded as A+ across assessed endpoints;
- DNSSEC subsequently activated as defense in depth.

Current classification:

- `CRITICAL_OPEN=0`
- `ORIGINAL_BEAGLE_HIGH_TECHNICALLY_REMEDIATED=2/2`
- `BEAGLE_CLEAN_RETEST=UNAVAILABLE_OR_PENDING`
- `TERMINAL_INDEPENDENT_SECURITY_ASSURANCE=OPEN`

Technical remediation must not be marketed as a clean independent pentest/retest PASS. Any buyer-required authenticated/manual scope remains separate.

## Legal / AI Act governance

Owner-controlled decisions are closed:

- `OWNER_LEGAL_PACKAGE_V1=APPROVED`
- `OWNER_LEGAL_DECISIONS=12/12_CLOSED`
- `OPERATOR_DECISION=CLOSED`
- `CONTRACTING_ENTITY_DECISION=CLOSED`
- `SELLER_DECISION=CLOSED`

Current owner-designated operator, contracting entity and seller:

`SAMUEL CERQUEIRA, UNIPESSOAL LDA`

Authoritative registry/tax facts remain required where they are legally or contractually material.

AI Act technical/review preparation is advanced, but the internal enterprise assurance workstreams remain:

- `LEGAL_8_OF_8=0/8_ACCEPTED`
- `MASTER_LEGAL_OPINION=OPEN_OPTIONAL_ENTERPRISE_ASSURANCE_UNLESS_SPECIFIC_REQUIREMENT_APPLIES`

The repository's `LEGAL_8_OF_8` model is an internal enterprise-assurance standard. It is **not** a literal statutory requirement to obtain eight legal opinions before the SaaS may launch or sell. Absence of 8/8 alone is not an automatic technical or commercial launch blocker. Any actually applicable AI Act, GDPR/ePrivacy, company, tax, contractual or conformity obligation remains binding for the affected scope.

## GDPR / privacy boundary

Internal technical preparation is advanced and V43 now provides the reviewed atomic DSR runtime contract. Final qualified/legal acceptance remains open where materially applicable for:

- controller/processor role allocation;
- Article 28 DPA sufficiency;
- lawful-basis conclusions;
- retention/deletion schedule;
- subprocessors and international transfers;
- SCC/TIA position where applicable;
- DPO/representative applicability;
- breach/notification wording;
- cookies/ePrivacy boundary.

`GDPR_FINAL_QUALIFIED_ACCEPTANCE=OPEN`

Provider runtime/configuration facts do not independently prove final legal sufficiency.

## Billing / VAT / commercial boundary

Existing source already contains the intended automatic-tax and tax-ID collection implementation. Do not reopen those as coding gaps without a demonstrated defect.

Current terminal facts remain bounded:

- `STRIPE_LIVE_CONNECTED=PASS_SIGNAL`
- `CHECKOUT_AUTOMATIC_TAX=IMPLEMENTED`
- `CHECKOUT_TAX_ID_COLLECTION=IMPLEMENTED`
- `AUTHORITATIVE_PORTUGUESE_VAT_REGIME=OPEN`
- `AUTHORITATIVE_REGISTRY_EVIDENCE=OPEN`
- `STRIPE_ENTITY_TAX_RECONCILIATION=OPEN`
- `LEGITIMATE_LIVE_CUSTOMER_LIFECYCLE=OPEN_EXTERNAL_EVENT`

Never fabricate a VAT registration, VAT ID, customer, subscription, invoice or payment to create evidence.

Software/SaaS CAE activity reconciliation remains owner-deferred to the final administrative phase:

- `SOFTWARE_SAAS_CAE_ASSOCIATED=false`
- `CAE_CHANGE_AUTHORIZED_NOW=false`

## Procurement / buyer evidence

Internal procurement and data-room preparation are advanced and may be used for due diligence, but external buyer acceptance remains separate.

Buyer-facing material must distinguish:

- implemented/internal evidence;
- provider/runtime facts;
- qualified external evidence;
- open external gates.

Do not claim SOC 2, ISO 27001, regulator approval, legal certification, clean pentest status or customer/buyer acceptance unless actually held and attributable.

## Protected exact-SHA Production path

The canonical `.github/workflows/vercel-production.yml` workflow is the only preferred Production convergence path. It:

1. requires a full 40-character current `main` SHA;
2. requires explicit `DEPLOY_PRODUCTION` confirmation;
3. verifies the SHA is exactly the current protected `main` tip;
4. validates Production environment governance before protected secrets;
5. validates Step-Up, malware scanning, PostHog, Sentry and other provider inputs;
6. runs lint, typecheck, test, build, full security and release authorization gates;
7. synchronizes governed provider bindings;
8. proves provider runtime;
9. builds/deploys the exact SHA;
10. re-verifies current `main` immediately before Production deployment/promotion;
11. validates release and enterprise readiness after deployment.

No direct/ad-hoc Vercel deployment should be used to bypass this protected workflow.

## Current control matrix

| Control | State | Current next action |
| --- | --- | --- |
| Protected source / release hygiene | STRONG | keep one canonical release lineage |
| V43 Production ledger | PASS_OBSERVED | preserve and verify postconditions |
| V43 human decision / approval | PASS | no reopening without new evidence |
| Article 5 / FRIA / DSR runtime objects | PASS_SIGNAL | exact-SHA authenticated runtime validation |
| RLS / FORCE RLS sampled V43 surfaces | PASS_SIGNAL | full role/tenant postcondition matrix |
| Exact-current-main Production | OPEN | governed `Vercel Production Deploy` on current main |
| Runtime maintenance / sustained stability | OPEN | revalidate on final exact-SHA Production |
| Original external High remediation | TECHNICALLY_REMEDIATED | retain evidence; do not re-open without contradictory evidence |
| Independent clean security retest/assurance | OPEN | obtain attributable terminal retest/scope when available/required |
| Owner legal decisions | PASS_INTERNAL | preserve release-bound legal package |
| Qualified Legal 8/8 | 0/8_ACCEPTED | enterprise-assurance upgrade path; not an automatic general launch blocker |
| GDPR qualified final review | OPEN | close legally material residuals |
| Registry / seller factual evidence | OPEN | obtain authoritative current company facts |
| VAT / fiscal acceptance | OPEN | obtain authoritative tax facts and reconcile Stripe |
| Legitimate LIVE paid lifecycle | EXTERNAL_EVENT_OPEN | first genuine customer lifecycle only |
| Procurement packet/data room | ADVANCED_INTERNAL | bind to accepted final release before final sharing |

## Score handling

The V1 snapshot's `ENTERPRISE_STRICT=56%` must not be used as the current operational score because V43 promotion and material security remediation occurred afterwards.

For management tracking only:

`ENTERPRISE_STRICT_PROVISIONAL≈62%`

This is **not** a terminal acceptance score and must never override an open evidence gate. A fresh canonical weighted score should be frozen only after exact-SHA Production/runtime reconciliation and the next external-assurance/fiscal evidence refresh.

## Current terminal blocker set

The selected strict `ENTERPRISE_100` target remains `NO_PASS` until the required evidence set is complete. Primary remaining blockers are:

1. current protected `main` is not yet the canonical Production SHA;
2. exact-SHA authenticated/runtime postconditions and sustained Production proof remain open;
3. terminal independent security retest/assurance remains open where required by the selected Enterprise standard;
4. authoritative registry/VAT/fiscal acceptance remains open;
5. legitimate LIVE paid lifecycle evidence remains external-event dependent;
6. enterprise Legal 8/8 / Master Opinion remain open for the internal high-assurance target, while not constituting an automatic statutory launch bar by themselves;
7. final Trust Center/procurement/data-room material must be rebound to the accepted final release.

## Hard decision

`V43_PRODUCTION=PASS_OBSERVED`  
`EXACT_SHA_PRODUCTION=NO_PASS`  
`SECURITY_ORIGINAL_HIGH_TECHNICAL_REMEDIATION=PASS_SIGNAL`  
`TERMINAL_INDEPENDENT_SECURITY_ASSURANCE=OPEN`  
`OWNER_LEGAL_DECISIONS=PASS`  
`LEGAL_8_OF_8=0/8_ACCEPTED`  
`VAT_FISCAL_ACCEPTANCE=OPEN`  
`ENTERPRISE_100=NO_PASS`

No stale tracker, internal document, AI analysis, owner approval, automated scan or generated evidence bundle may override a terminal evidence gate. Conversely, completed work must not be reopened merely because an older snapshot predates its completion.
