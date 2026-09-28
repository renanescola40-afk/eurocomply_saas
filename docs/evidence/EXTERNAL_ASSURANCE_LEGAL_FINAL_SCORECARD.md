# RISCK COMPLY — External Assurance + Legal Final Scorecard

Status date: 2026-09-28  
Current `main` SHA verified: `0fdec34b19b200aaab44e8f5495aebe8a6b77d6c`  
Current canonical production deployment verified: `dpl_E8ph3QNWoqv3MYw71JnUQoHAncuC`  
Current production SHA verified: `0fdec34b19b200aaab44e8f5495aebe8a6b77d6c`

## Exact-SHA production parity

`MAIN_SHA=0fdec34b19b200aaab44e8f5495aebe8a6b77d6c`

`PRODUCTION_SHA=0fdec34b19b200aaab44e8f5495aebe8a6b77d6c`

`PRODUCTION_DEPLOYMENT=dpl_E8ph3QNWoqv3MYw71JnUQoHAncuC`

`PRODUCTION_STATE=READY`

`SHA_PARITY=PASS_CURRENT_PRODUCTION`

This replaces the previous branch-start-only parity statement. The merged assurance/legal closure release is directly observed as the current Vercel production deployment for the same `main` SHA.

## Assurance scorecard

| Area | Status | Percent | Evidence / truth boundary | Blocker | Next action |
| --- | --- | ---: | --- | --- | --- |
| CSA STAR for AI Level 1 | PUBLICLY_VERIFIED | 100 | CSA STAR Registry lists RISCK COMPLY since 2026-09-21 with STAR for AI Level 1 / AI CAIQ self-assessment v1.1.0 | none for Level 1 publication | retain/reverify registry evidence before major diligence |
| Standard CSA STAR Level 1 | PREPARATION_REQUIRED | 35 | current official submittable target recorded as CAIQ v4.1 STAR Level 1 Security Questionnaire | questionnaire package not yet completed/submitted | build evidence-mapped CAIQ v4.1 package |
| TLS external validation | NOT_CANONICALLY_RECORDED | 60 | production is HTTPS; no current Qualys grade is stored in canonical evidence | external scan result missing | run/record current Qualys SSL Labs result |
| HTTP security | DATED_EVIDENCE | 75 | prior MDN Observatory baseline B/75 recorded | current retest missing | rerun and record current result |
| Internet standards — web | DATED_EVIDENCE | 75 | prior Internet.nl web score 75% recorded | current retest + provider/domain gap reconciliation | rerun and record current result |
| Internet standards — email | DATED_EVIDENCE | 69 | prior Internet.nl email score 69% recorded | current retest + domain/provider remediation | rerun and record current result |
| OpenSSF | REMEDIATION / RECHECK | 46 | prior local preview 4.6/10 recorded | public/current score not verified | current public recheck + safe repo fixes |
| External black-box security assessment | REPORT_RECEIVED | 70 | attributable confidential third-party black-box report exists from 2026-09-12 | remediation/retest state remains open in canonical evidence | reconcile findings against current release; obtain attributable clean retest if still required |
| Independent manual pentest | EXTERNAL_OR_BUYER_REQUIRED | 0 | no evidence supports labeling existing automated/black-box evidence as a manual independent pentest | external assessor if buyer requires it | procure only when contract/procurement requires |
| Legal internal documentation alignment | PREPARED / HUMAN_FACTS_REMAIN | 90 | legal packs, eight review packages and public legal surfaces exist; repository still records authoritative company/final-version gates | authoritative missing facts/finalization | close exact factual fields without guessing |
| Qualified counsel approval | EXTERNAL_OR_BUYER_REQUIRED | 0 | no attributable qualified counsel acceptance in canonical evidence | human legal reviewer | obtain when required for contracting/risk posture |
| DPA Article 28 package | PREPARED / FINAL_FACT_RECONCILIATION | 90 | DPA review material and Article 28 control work exist | entity/provider/final signature/version truth | reconcile and finalize exact canonical version |
| International transfers / SCC | PREPARED / PROVIDER_FACT_RECONCILIATION | 85 | transfers route/material exists | current provider legal entities, processing locations and mechanisms must remain evidence-backed | complete provider-by-provider matrix |
| Subprocessors | PREPARED / RECONCILIATION_REQUIRED | 85 | register exists | active-provider truth must match production/account reality | canonicalize current providers only |
| Retention / deletion | PREPARED / FACT_GAPS | 85 | policies/process documentation exists | provider-specific retention windows must not be guessed | mark unknowns FACT_REQUIRED and close proven fields |
| Privacy | PREPARED | 90 | public/document review material exists | final authoritative company/provider facts | exact factual reconciliation |
| Terms | PREPARED | 90 | public/document review material exists | governing law/forum/commercial facts where not yet authoritative | finalize factual decisions |
| Cookie / consent | IMPLEMENTED / RUNTIME_RECHECK_REQUIRED | 90 | consent controls and cookie-policy work exist; exact-current production consent behavior is not yet recorded for this release | exact-current production runtime proof remains required | run and record production consent smoke test after final release merge |
| Acceptable Use | PREPARED | 90 | public route/review material exists | final version/effective-state reconciliation | finalize with canonical Terms relationship |
| Incident response | IMPLEMENTED / DOCUMENTED | 95 | incident-response documentation exists | keep processor/controller notification distinctions truthful | periodic operational validation |
| EU AI Act mapping | IMPLEMENTED / LEGAL_AMBIGUITIES_SEPARATED | 95 | extensive AI Act mapping exists | genuinely ambiguous interpretations require legal review, not guessing | maintain official-source reconciliation |
| Procurement data room | BUYER_READY_INTERNAL_PACKAGE | 98 | broad security/privacy/AI-governance/continuity/commercial evidence package exists | final external assurance and exact legal facts are separate external/human dependencies | keep one canonical index and current evidence |

## Aggregate status

These percentages intentionally separate internally controllable readiness from external third-party assurance.

`INTERNAL_ASSURANCE_READINESS=96_PERCENT`

`EXTERNAL_SELF_ASSESSMENT_READINESS=92_PERCENT`

`INDEPENDENT_THIRD_PARTY_ASSURANCE=55_PERCENT`

`LEGAL_DOCUMENTATION_READINESS=90_PERCENT`

`QUALIFIED_COUNSEL_REVIEW=EXTERNAL_OR_BUYER_REQUIRED`

`PROCUREMENT_READINESS=98_PERCENT`

`ENTERPRISE_READINESS=96_PERCENT`

## Launch gates

`PUBLICATION_GO=YES`

`CUSTOMER_ACQUISITION_GO=YES`

`PILOT_GO=YES`

`ENTERPRISE_SALES_GO=YES_WITH_EVIDENCE_BOUND_DISCLOSURE`

These gates do not mean every enterprise buyer will waive a manual pentest, counsel review, custom DPA negotiation, security questionnaire, insurance requirement, or other buyer-specific procurement condition.

## Remaining internally controllable closure work

1. Complete standard CSA STAR Level 1 CAIQ v4.1 preparation package.
2. Record current Qualys SSL Labs evidence.
3. Re-run and reconcile MDN Observatory, Internet.nl and public OpenSSF evidence.
4. Reconcile provider-by-provider transfer/subprocessor/retention facts against active production configuration without inventing unknowns.
5. Finalize exact factual legal fields that are already known/authoritative; keep unproven fields explicitly gated.
6. Reconcile the 2026-09-12 external black-box findings against the current release and record remediation/retest evidence where attributable.
7. Record exact-current production cookie/consent runtime behavior after the final release merge.

## Remaining human/external blockers

- qualified counsel approval, only where chosen or buyer/contract requires it;
- independent manual penetration test, only where a buyer requires that assurance level;
- buyer-specific procurement/security/legal requirements;
- authoritative company facts that cannot be derived from repository/provider evidence;
- external scanner/registry results that require a human/browser action or third-party processing.

## Terminal rule

Do not lower internal readiness merely because optional paid certifications are absent. Do not raise external assurance merely because internal evidence exists.

`INTERNALLY_CONTROLLABLE_ASSURANCE_AND_LEGAL_CLOSURE=NOT_YET_COMPLETE`

Reason: standard CSA STAR Level 1 preparation, fresh free public assurance checks, provider/legal truth reconciliation, external-assessment remediation/retest reconciliation, and exact-current consent runtime proof remain internally actionable or evidence-collection workstreams.
