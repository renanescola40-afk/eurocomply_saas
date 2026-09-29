# RISCK COMPLY — External Assurance + Legal Final Scorecard

Status date: 2026-09-29  
Classification: `CURRENT_STATUS / EVIDENCE_BOUND`

> Reconciliation note (2026-09-29): this scorecard previously ended with `INTERNALLY_CONTROLLABLE_ASSURANCE_AND_LEGAL_CLOSURE=NOT_YET_COMPLETE`. That internal status was superseded by `docs/evidence/ASSURANCE_LEGAL_TERMINAL_CLOSURE_2026-09-29.md`, which records the internally controllable assurance/legal workstream as complete while preserving all external/human dependencies. Historical percentages below are retained only where they describe the 2026-09-28 evidence snapshot; they must not override the terminal classification.

## Current canonical terminal classification

`INTERNALLY_CONTROLLABLE_ASSURANCE_AND_LEGAL_CLOSURE=COMPLETE`

`LEGAL_INTERNAL_DOCUMENTATION_CONTROL=COMPLETE_EVIDENCE_BOUND`

`QUALIFIED_COUNSEL_APPROVAL=EXTERNAL_OR_BUYER_REQUIRED`

`INDEPENDENT_MANUAL_PENTEST=EXTERNAL_OR_BUYER_REQUIRED`

`CUSTOM_DPA_NEGOTIATION=BUYER_SPECIFIC`

`BUYER_SECURITY_QUESTIONNAIRE=BUYER_SPECIFIC`

Current canonical evidence source: `docs/evidence/ASSURANCE_LEGAL_TERMINAL_CLOSURE_2026-09-29.md`.

## Historical 2026-09-28 assurance snapshot

The following percentages are retained as dated evidence-strength indicators, not as current internal-completion blockers.

| Area | Status | Percent | Evidence / truth boundary | Remaining dependency |
| --- | --- | ---: | --- | --- |
| CSA STAR for AI Level 1 | PUBLICLY_VERIFIED | 100 | Public registry listing exists; Level 1 is self-assessment/transparency, not independent certification | retain/reverify registry evidence before major diligence |
| Standard CSA STAR Level 1 | READY_FOR_OFFICIAL_WORKBOOK_AND_HUMAN_SUBMISSION | 35 | Evidence/domain mapping is internally prepared | official workbook population/submission is an external/human action |
| TLS external validation | EXTERNAL_SCAN_ACTION | 60 | HTTPS production exists; fresh Qualys result is not canonical evidence | run/retain scan when desired |
| HTTP security | EXTERNAL_SCAN_ACTION | 75 | prior dated MDN Observatory evidence exists | rerun when desired |
| Internet standards — web | EXTERNAL_SCAN_ACTION | 75 | prior dated Internet.nl web evidence exists | rerun when desired |
| Internet standards — email | EXTERNAL_SCAN_ACTION | 69 | prior dated Internet.nl email evidence exists | rerun when desired |
| OpenSSF | EXTERNAL_PUBLIC_EVIDENCE_ACTION | 46 | prior local/public evidence was not a current terminal proof | public recheck when desired |
| External black-box security assessment | REPORT_RECEIVED | 70 | attributable third-party black-box report exists | clean independent retest only if strategically desired/required |
| Independent manual pentest | EXTERNAL_OR_BUYER_REQUIRED | 0 | no evidence supports relabeling automated/black-box testing as a manual independent pentest | external assessor if required |
| Legal internal documentation alignment | COMPLETE_EVIDENCE_BOUND | 100 internal | review-ready legal/privacy/security material exists; unprovable facts remain gated | qualified counsel only where required |
| Qualified counsel approval | EXTERNAL_OR_BUYER_REQUIRED | 0 | not claimed without attributable counsel evidence | external legal reviewer |
| DPA Article 28 package | COMPLETE_EVIDENCE_BOUND | 100 internal | review-ready package and control matrix exist | buyer-specific negotiation/signature may remain |
| International transfers / SCC | COMPLETE_EVIDENCE_BOUND | 100 internal | provider-by-provider unknowns remain explicitly `FACT_REQUIRED` rather than guessed | authoritative provider facts when unavailable internally |
| Subprocessors | COMPLETE_EVIDENCE_BOUND | 100 internal | canonical register exists with truth-bounded provider status | authoritative provider/account facts where unavailable |
| Retention / deletion | COMPLETE_EVIDENCE_BOUND | 100 internal | policy/process documentation exists; unknown provider windows are not invented | provider facts where unavailable |
| Privacy | COMPLETE_EVIDENCE_BOUND | 100 internal | public/review material exists | external legal approval only if required |
| Terms | COMPLETE_EVIDENCE_BOUND | 100 internal | review-ready material exists | contract-specific final negotiation if applicable |
| Cookie / consent | COMPLETE_EVIDENCE_BOUND | 100 internal | controls/documentation exist; future runtime rechecks are operational evidence refreshes | recheck on material release/change |
| Acceptable Use | COMPLETE_EVIDENCE_BOUND | 100 internal | review-ready material exists | final signed contractual context if applicable |
| Incident response | IMPLEMENTED / DOCUMENTED | 100 internal | incident-response documentation exists | periodic operational validation |
| EU AI Act mapping | IMPLEMENTED / EVIDENCE_BOUND | 100 internal | mapping exists; ambiguous legal interpretations are not guessed | qualified legal review only where needed |
| Procurement data room | BUYER_READY_INTERNAL_PACKAGE | 100 internal | canonical buyer/procurement package exists | buyer acceptance remains external |

## Current commercial gates

`PUBLICATION_GO=PASS`

`CUSTOMER_ACQUISITION_GO=PASS`

`DEMO_GO=PASS`

`PILOT_GO=PASS`

`SMB_GO=PASS`

`MID_MARKET_GO=PASS`

`ENTERPRISE_SALES_GO=PASS_WITH_EVIDENCE_BOUND_DISCLOSURE`

These gates do not imply that every enterprise buyer will waive independent pentesting, legal review, insurance, custom DPA/SLA terms, security questionnaires or other buyer-specific procurement requirements.

## Remaining external / human actions

1. Populate and submit the official current CSA STAR Level 1 CAIQ v4.1 workbook when an authorized human chooses to proceed.
2. Run/retain fresh Qualys, MDN Observatory, Internet.nl and public OpenSSF evidence when useful for procurement.
3. Obtain independent manual pentest/retest only when strategically desired or required by a buyer.
4. Obtain qualified counsel sign-off only when strategically desired, legally required or demanded by a buyer/contract.
5. Provide authoritative company identifiers, addresses, signatory facts and other human/company facts where final contracting requires them.
6. Complete buyer-specific questionnaires, DPA/SLA negotiation, IdP/SAML setup or procurement actions when an actual counterparty requests them.

## Truth boundary

Do not lower internal readiness merely because optional external certifications or scans are absent. Do not raise external assurance merely because internal documentation exists. Do not represent drafts as signed agreements, self-assessments as independent audits, technical remediation as a clean independent retest, outreach as buyer interest, or internal evidence as legal approval.

`INTERNALLY_CONTROLLABLE_ASSURANCE_AND_LEGAL_CLOSURE=COMPLETE`

`REMAINING_OPEN_ITEMS=EXTERNAL_OR_HUMAN_OR_BUYER_SPECIFIC`
