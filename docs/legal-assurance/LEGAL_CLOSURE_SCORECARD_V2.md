# RISCK COMPLY — Legal + GDPR + EU AI Act Closure Scorecard V2

Date: 2026-09-09  
Mode: `FINAL_LEGAL_REGULATORY_ASSURANCE_CLOSURE`

This scorecard deliberately separates repository-controlled readiness from external assurance. Percentages are working closure estimates, not legal opinions, certifications or regulator determinations.

## Current percentages

```text
LEGAL_IMPLEMENTATION_PERCENT=80
GDPR_READINESS_PERCENT=58
AI_ACT_REGULATORY_READINESS_PERCENT=85
QUALIFIED_REVIEW_PERCENT=0
COMMERCIAL_LEGAL_PERCENT=45

INTERNAL_CONTROLLABLE_CLOSURE_PERCENT=72
INTERNAL_CONTROLLABLE_REMAINING_PERCENT=28
TOTAL_LEGAL_ASSURANCE_CLOSURE_PERCENT=46
TOTAL_LEGAL_ASSURANCE_REMAINING_PERCENT=54
```

### Interpretation

- `INTERNAL_CONTROLLABLE_CLOSURE_PERCENT` tracks work that can be closed by repository/provider evidence, official-source mapping and owner-controlled configuration without pretending external approval exists.
- `TOTAL_LEGAL_ASSURANCE_CLOSURE_PERCENT` includes the genuinely outstanding external/qualified layer and therefore remains materially lower.
- `QUALIFIED_REVIEW_PERCENT=0` means 0/8 required AI Act qualified review tracks are accepted. Preparation readiness does not count as human acceptance.

## Gate status

| Gate | State | Reason |
|---|---|---|
| LEGAL_ENTITY_FACTS | BLOCKED | registered office and authoritative NIF/NIPC unresolved |
| PRIVACY_ART13_14_MAPPING | BLOCKED | matrix built; legal bases, transfers, retention, DPO/Art.14 delivery facts and public-page reconciliation remain |
| DPA_ARTICLE_28 | BLOCKED | strong core structure; party identity, subprocessor mechanism, transfers, deletion/return and TOM annex remain |
| SUBPROCESSORS | BLOCKED | detailed production-aware draft exists; account-specific legal roles/transfers/retention incomplete |
| GDPR_TOMS_ART32 | BLOCKED_FOR_FINAL_CONTRACT | strong implementation; provider/retention/exact-runtime evidence not fully frozen |
| GDPR_BREACH_PROCESS | PASS_DOCUMENTED | tabletop/execution evidence and contract-specific target remain |
| DATA_SUBJECT_RIGHTS | PARTIAL | export and delete intake strong; restriction/objection/deadline tracking incomplete |
| RETENTION_SCHEDULE | BLOCKED | operational classes exist; approved factual periods/enforcement/provider backup cycles incomplete |
| ROPA | BLOCKED_FOR_FINAL | structure complete; legal bases/transfers/retention incomplete |
| DPO_REQUIREMENT | UNCERTAIN | no mandatory trigger proven; scale/sensitive-data facts incomplete |
| DPIA_SCREENING | PASS | result `DPIA_REQUIRED=UNCERTAIN` pending scale/processing facts |
| AI_ACT_APPLICABILITY | STRONG_PRE_REVIEW | existing legal source register, classification memo and review packages |
| AI_ACT_OFFICIAL_GUIDANCE | STRONG_PRE_REVIEW | Service Desk response incorporated with non-binding boundary |
| ARTICLE_5 | IMPLEMENTED_PENDING_EXTERNAL_REVIEW | qualified review not accepted |
| ARTICLE_50 | IMPLEMENTED_PENDING_EXTERNAL_REVIEW | qualified review not accepted |
| FRIA | IMPLEMENTED_PENDING_EXTERNAL_REVIEW | qualified review not accepted |
| PROVIDER_DEPLOYER_MAPPING | IMPLEMENTED_PENDING_EXTERNAL_REVIEW | qualified review not accepted |
| HIGH_RISK_CLASSIFICATION_METHOD | IMPLEMENTED_PENDING_EXTERNAL_REVIEW | qualified review not accepted |
| CONFORMITY_METHODOLOGY | IMPLEMENTED_PENDING_EXTERNAL_REVIEW | qualified review not accepted |
| GPAI_APPLICABILITY | IMPLEMENTED_PENDING_EXTERNAL_REVIEW | qualified review not accepted |
| TERMS_DOCUMENTATION | PARTIAL | service/no-legal-advice basics exist; liability/governing law/forum/refunds/export/termination require completion |
| QUALIFIED_ASSURANCE_GO | BLOCKED | 0/8 accepted |
| LEGAL_FINAL | BLOCKED | factual + external gates remain |

## Count snapshot

This scorecard counts gate states, not individual document lines:

```text
PASS_COUNT=2
PARTIAL_OR_PRE_REVIEW_COUNT=10
BLOCKED_OR_UNCERTAIN_COUNT=9
PENDING_EXTERNAL_REVIEW_TRACKS=8
```

## Highest-value remaining blockers

### LEG-ENTITY-01
AREA: legal entity  
SEVERITY: HIGH  
STATE: BLOCKED  
WHY_OPEN: registered office and NIF/NIPC lack authoritative single-source confirmation.  
CAN_AI_CLOSE: NO  
REQUIRES_OWNER: YES, if owner has authoritative company extract  
REQUIRES_SPECIALIST: NO  
REQUIRES_COUNSEL: NO for the raw fact itself  
NEXT_ACTION: obtain current Portuguese registry evidence.  
ACCEPTANCE_CRITERIA: one current authoritative source tying entity name, registered office and identifier together.

### GDPR-TRANSFER-01
AREA: international transfers/subprocessors  
SEVERITY: HIGH  
STATE: BLOCKED  
WHY_OPEN: active provider account terms, access/support locations and transfer mechanisms are incomplete.  
CAN_AI_CLOSE: PARTIAL via connected provider evidence  
REQUIRES_OWNER: possibly for account contracts/settings  
REQUIRES_SPECIALIST: privacy review for final legal treatment  
REQUIRES_COUNSEL: conditional  
NEXT_ACTION: provider-by-provider account evidence reconciliation.  
ACCEPTANCE_CRITERIA: each active provider has factual role, locations, DPA/contract, Chapter V mechanism and retention state.

### GDPR-RETENTION-01
AREA: retention/deletion  
SEVERITY: HIGH  
STATE: BLOCKED  
WHY_OPEN: classes exist but legal/business periods and actual provider enforcement are not approved/proven.  
CAN_AI_CLOSE: PARTIAL  
REQUIRES_OWNER: YES for business retention choices  
REQUIRES_SPECIALIST: YES for legal-basis review where material  
REQUIRES_COUNSEL: conditional  
NEXT_ACTION: build dataset/provider schedule from actual tables and provider capabilities.  
ACCEPTANCE_CRITERIA: purpose, basis, period/criteria, trigger, deletion/anonymisation, backup cycle and legal-hold exception per data class.

### GDPR-RIGHTS-01
AREA: data subject rights  
SEVERITY: MEDIUM  
STATE: PARTIAL  
WHY_OPEN: restriction, objection and statutory deadline tracking lack full operational evidence.  
CAN_AI_CLOSE: YES for repository-controlled workflow; external legal review only for exception/legal-basis decisions  
NEXT_ACTION: add rights-request register/workflow and runtime tests.

### ASSURANCE-01
AREA: EU AI Act qualified assurance  
SEVERITY: HIGH  
STATE: PENDING_EXTERNAL_REVIEW  
WHY_OPEN: 8 packages prepared, 0/8 accepted qualified reviews.  
CAN_AI_CLOSE: NO  
REQUIRES_SPECIALIST: YES  
REQUIRES_COUNSEL: only for workstreams requiring legal/commercial judgment  
NEXT_ACTION: bind packages to final exact-SHA/runtime evidence and assign qualified reviewers.  
ACCEPTANCE_CRITERIA: reviewer identity/qualification/scope/independence/version/findings/limitations/disposition/date and attributable approval for every required track.

## Next big rock

`GDPR_PROVIDER_RETENTION_RIGHTS_CLOSURE`

Exact action: reconcile provider transfer facts + build final retention schedule + implement a rights-request deadline/decision register while keeping all external review states fail-closed.