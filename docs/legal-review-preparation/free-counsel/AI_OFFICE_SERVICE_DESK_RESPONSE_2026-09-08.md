# RISCK COMPLY — AI Act Service Desk response alignment

Date received: 2026-09-08  
Case: `SIP0001446`  
Classification: `AUTHORITATIVE_GUIDANCE_SOURCE`  
Source authority: European Commission AI Act Service Desk / DG CONNECT  
Binding status: `NON_BINDING`  
Qualified counsel acceptance: `NO`

## Purpose

Retain a public-safe, bounded alignment of the official implementation guidance received in response to the RISCK COMPLY eight-workstream question pack.

The original response remains in the private communications record. This repository file deliberately summarizes rather than reproduces the full correspondence and contains no private founder identifiers, mailbox addresses or customer data.

The Service Desk expressly states that it provides implementation information/guidance, not legal or technical advice; its answers are not legally binding and cannot replace professional legal advice. Accordingly this evidence may strengthen legal-source provenance and reviewer efficiency, but it does **not** satisfy any `LEGAL_8_OF_8` qualified-review gate.

## Current-law source boundary communicated by the Service Desk

The response directed RISCK COMPLY to the consolidated AI Act text incorporating the 2026 Digital Omnibus on AI amendments and stated, in substance:

- the AI Act, as amended from time to time, is the primary binding legal text;
- guidelines and codes of practice are non-binding materials that may assist operators with compliance;
- when application dates are amended, obligations follow the amended dates;
- Article 113 is the operative location for dates of application.

Internal effect:

```text
LEGAL_RULES_OFFICIAL_GUIDANCE=RECEIVED
LEGAL_RULES_SOURCE_PRIORITY_MODEL=ALIGNED
LEGAL_RULES_QUALIFIED_ACCEPTANCE=PENDING
```

## Workstream alignment

| Workstream | Service Desk guidance retained | Internal conclusion allowed | Still not established |
|---|---|---|---|
| `LEGAL_RULES` | AI Act as amended is the binding core; guidelines/codes are non-binding assistance; amended application dates govern | Keep versioned legal-rule precedence and date-aware applicability | Case-specific legal interpretation or counsel opinion |
| `ARTICLE_5` | Operators are responsible for self-assessment of whether their systems fall within prohibited practices; the Act does not prescribe a specific assessment method | RISCK COMPLY may remain a structured assessment/escalation support tool rather than an automatic legal approver | The Service Desk did not approve a specific RISCK algorithm, exception decision or “legal” outcome |
| `ARTICLE_50` | Transparency duties depend on operator role and system characteristics; Article 50(1)-(2) concern providers and 50(3)-(4) deployers; an operator may occupy multiple roles | Preserve actor/type/trigger-specific transparency workflows and cumulative-role handling | Product-specific final wording, trigger conclusion or counsel sign-off |
| `FRIA` | FRIA is distinct from and broader than a DPIA; where personal data are processed it should complement the DPIA while avoiding duplication; amended Article 27 supports cross-references/reuse | Keep FRIA and DPIA separate artifacts with controlled evidence reuse/cross-reference | Customer-specific FRIA sufficiency or legal approval |
| `DEPLOYER_OBLIGATIONS` | Provider and deployer duties are different; provider compliance does not by itself prove deployer compliance; multi-role operators may accumulate duties | Maintain separate deployer/provider evidence and role-scoped gates | Final role classification for RISCK COMPLY or any customer deployment |
| `HIGH_RISK_PROVIDER` | Service Desk identified provider duty sources, including Article 16 for high-risk systems and real-world testing provisions | Continue mapping provider controls to operational evidence gates | It did not determine that merely using RISCK COMPLY to govern a high-risk system makes or does not make RISCK COMPLY itself a high-risk provider; this remains product/fact-specific |
| `CONFORMITY` | Conformity assessment concerns Chapter III Section 2 requirements; provider duties include EU declaration, CE marking and relevant registration; EU database timing was described using the amended framework | Preserve conformity assessment, declaration, CE marking and registration as distinct gates owned by the legally responsible actor | RISCK COMPLY is not thereby authorised to certify conformity, issue legal approval or act as a conformity body |
| `GPAI` | GPAI provider duties differ by systemic-risk status; the Act defines downstream provider; AI Office GPAI guidance addresses downstream modification; AI-system obligations depend on the resulting assessment | Keep upstream GPAI, downstream-provider and AI-system role records separate | Final role determination for a particular integration/fine-tune/rebranding/modification scenario |

## Specific guidance anchors retained

### Article 5

The Service Desk confirmed the operator self-assessment principle and that the AI Act does not mandate a particular assessment method.

Safe product consequence:

```text
SOFTWARE_CAN_STRUCTURE_SELF_ASSESSMENT=true
SOFTWARE_CAN_ESCALATE_AMBIGUITY=true
SOFTWARE_LEGAL_APPROVAL_AUTHORITY=false
```

The second line is an internal fail-safe design choice, not a claim that the Service Desk prescribed that exact implementation.

### Provider vs deployer

The response specifically reinforced that provider and deployer obligations are separate and that satisfying provider duties does not prove deployer compliance. It also highlighted cumulative duties where one operator occupies more than one role.

Safe product consequence:

```text
PROVIDER_EVIDENCE_NE_DEPLOYER_COMPLIANCE
MULTI_ROLE_CUMULATIVE_OBLIGATIONS=true
ROLE_SCOPED_EVIDENCE_REQUIRED=true
```

### Article 50

The response reinforced the actor split in Article 50 and the relevance of AI-system capabilities/characteristics. RISCK COMPLY should therefore preserve role-specific transparency controls rather than one universal “Article 50 compliant” switch.

### FRIA / DPIA

The Service Desk described FRIA as a distinct accountability assessment with a broader fundamental-rights scope than a DPIA. It also relayed the amended Article 27 direction that the future AI Office template can support cross-references to relevant DPIA sections or inclusion of relevant DPIA material.

Safe product consequence:

```text
FRIA_DISTINCT_FROM_DPIA=true
CONTROLLED_EVIDENCE_REUSE_ALLOWED=true
DUPLICATIVE_ASSESSMENT_SHOULD_BE_AVOIDED=true
CUSTOMER_FRIA_LEGAL_SUFFICIENCY_NOT_AUTOMATIC=true
```

### Conformity lifecycle

The response separately discussed conformity assessment, EU declaration of conformity, CE marking and EU database registration. That supports RISCK COMPLY's decision to model these as distinct lifecycle/evidence gates rather than one synthetic compliance flag.

The response also stated that the official EU database was not yet operational and, under the amended timeline communicated by the Service Desk, the identified Annex III registration obligation would apply from 2 December 2027. Treat that date as a versioned source fact subject to future legislative change, not a permanent hard-coded constant.

### GPAI / downstream provider

The response confirmed separate GPAI obligations, the downstream-provider definition and the relevance of AI Office guidance on downstream modification. This supports keeping model-provider, downstream-provider/system-provider and deployer responsibilities separately represented in inventory and evidence.

## Marketing / positioning question

The submitted case also asked whether RISCK COMPLY may describe itself as “EU AI Act readiness support” or “AI compliance operations support” while expressly avoiding certification/compliance-guarantee claims.

The resolution did **not** provide a direct affirmative approval of those specific marketing phrases.

Therefore:

```text
AI_OFFICE_MARKETING_PHRASE_APPROVAL=NOT_RECEIVED
PUBLIC_CLAIMS_GUARD_REMAINS_REQUIRED=true
NO_CERTIFICATION_CLAIM=true
NO_GUARANTEED_COMPLIANCE_CLAIM=true
NO_REGULATOR_APPROVAL_CLAIM=true
NO_FINAL_LEGAL_DETERMINATION_CLAIM=true
```

## Review-status effect

The official guidance materially improves source provenance and reduces duplicated research for the eventual qualified reviewer. It does not change qualified acceptance:

```text
AI_OFFICE_RESPONSE=RECEIVED_AND_ROUTED
AUTHORITATIVE_GUIDANCE_WORKSTREAM_COVERAGE=8/8_ROUTED_WITH_PARTIAL_SCOPE_NOTES
LEGAL_8_OF_8=0/8_ACCEPTED
QUALIFIED_REVIEW_WEIGHT_ACCEPTED=0/51
MASTER_LEGAL_OPINION=OPEN
```

`8/8_ROUTED_WITH_PARTIAL_SCOPE_NOTES` means each canonical workstream now has relevant official guidance routed into the review package; it does **not** mean the Service Desk fully answered every RISCK-specific sub-question.

## Sources named in the official response

For reviewer convenience, the response pointed to these official source categories/pages:

- consolidated AI Act text;
- Digital Omnibus on AI amendments;
- Article 50 transparency guidelines;
- prohibited-practices guidelines;
- AI Office implementation-guideline programme, including future FRIA material;
- GPAI provider guidelines;
- EU AI Act Compliance Checker;
- AI Act Single Information Platform.

Reviewers must use the current version at review time rather than assuming the 2026-09-08 state remains unchanged.

## Next gate

1. include this alignment in each applicable qualified-review handoff;
2. preserve the underlying official response privately for authenticity/provenance;
3. update product/legal controls only where the guidance creates a real delta;
4. keep unresolved product-role/high-risk/marketing conclusions fail-closed;
5. require a genuine qualified reviewer for `LEGAL_8_OF_8` credit.
