# RISCK COMPLY — Legal + EU AI Act Qualified Assurance Closure Status

Date: 2026-09-09  
Mode: `LEGAL_EU_AI_ACT_QUALIFIED_ASSURANCE_CLOSURE_V1`  
Base `main` SHA assessed: `72e8431a5fa6869a65f8e0dac57dd4cc0a8de1bd`

## Terminal truth

```text
AI_IMPLEMENTATION=CAN_REACH_100
AI_ACT_QUALIFIED_COMPLETION=0/8_ACCEPTED
LEGAL_RULES_REVIEW=BLOCKED_EXTERNAL_QUALIFIED_REVIEW
ARTICLE_5_REVIEW=BLOCKED_EXTERNAL_QUALIFIED_REVIEW
ARTICLE_50_REVIEW=BLOCKED_EXTERNAL_QUALIFIED_REVIEW
FRIA_REVIEW=BLOCKED_EXTERNAL_QUALIFIED_REVIEW
DEPLOYER_OBLIGATIONS_REVIEW=BLOCKED_EXTERNAL_QUALIFIED_REVIEW
HIGH_RISK_PROVIDER_REVIEW=BLOCKED_EXTERNAL_QUALIFIED_REVIEW
CONFORMITY_REVIEW=BLOCKED_EXTERNAL_QUALIFIED_REVIEW
GPAI_REVIEW=BLOCKED_EXTERNAL_QUALIFIED_REVIEW
TERMS_FINAL=BLOCKED_COUNSEL_AND_FOUNDER_FACTS
PRIVACY_FINAL=BLOCKED_COUNSEL_AND_FOUNDER_FACTS
DPA_FINAL=BLOCKED_COUNSEL_AND_FOUNDER_FACTS
SUBPROCESSORS_FINAL=BLOCKED_PROVIDER_FACTS_AND_COUNSEL
EU_AI_ACT_PRODUCT_COVERAGE_GO=BLOCKED_QUALIFIED_REVIEW
LEGAL_FINAL=BLOCKED
ENTERPRISE_100=NO
```

No software check, AI-generated opinion, CI result, internal self-review or synthetic signature can change the eight qualified workstreams to PASS.

## Work completed in this closure pass

### 1. Official AI Act source refresh

The legal-source register was refreshed against current official EU material on 2026-09-09.

Current binding-law timeline retained in the product rule registry:

- general AI Act application and Article 50 transparency obligations: **2026-08-02**;
- Article 5 additions introduced by Regulation (EU) 2026/1744: **2026-12-02**;
- qualifying Article 50(2) transition for pre-existing provider systems: until **2026-12-02**;
- Annex III / Article 6(2) high-risk rules: **2027-12-02**;
- Annex I / Article 6(1) high-risk product rules: **2028-08-02**.

Official Commission guidance and voluntary Codes of Practice were added as non-binding sources. They are explicitly not promoted to binding law.

### 2. Legal-rule freshness control

The code registry had legal source verification from 2026-07-30 and review deadlines for Article 5 / Article 50-related rules that had elapsed on 2026-08-30.

This closure updates:

```text
AI_ACT_LEGAL_RULES_VERSION=2026-09-09.1
SOURCE_VERIFIED_AT=2026-09-09
ARTICLE_5_NEXT_REVIEW=2026-10-09
ARTICLE_50_NEXT_REVIEW=2026-10-09
```

This is a source-governance correction, not a qualified legal approval.

### 3. Public claim safety revalidation

Production surfaces reviewed on 2026-09-09 retain conservative language:

- readiness / governance / evidence support language is used;
- no public claim of EU AI Act certification was observed;
- no claim of regulator approval was observed;
- no guarantee of regulatory compliance was observed;
- public Privacy, DPA and Subprocessor surfaces remain explicitly marked as legal review drafts or summaries.

Accordingly, no public-claims emergency removal was required in this pass.

### 4. Founder identity facts reconciled

Known non-conflicting owner facts were inserted into the Terms, Privacy and DPA review drafts:

- `SAMUEL CERQUEIRA, UNIPESSOAL LDA`;
- RISCK COMPLY brand;
- Avenida de Roma 112-A;
- 1700-353 Lisboa, Portugal;
- https://www.risckcomply.com.

A conflicting NIF/NIPC history was detected. No value was selected or published as authoritative. The identifier remains fail-closed pending a single authoritative owner/official source.

### 5. Qualified review package state

The repository contains the eight canonical review-package tracks and strict validation machinery, but no genuine accepted qualified-review evidence is present for the required workstreams.

Therefore:

```text
QUALIFIED_REVIEWER_ASSIGNMENTS_ACCEPTED=0/8
AI_ACT_QUALIFIED_COMPLETION=0%
```

## Eight qualified workstreams

| Workstream | Repository preparation | Qualified human acceptance |
|---|---|---|
| LEGAL_RULES | READY / refreshed | BLOCKED |
| ARTICLE_5 | READY / refreshed | BLOCKED |
| ARTICLE_50 | READY / refreshed | BLOCKED |
| FRIA | READY | BLOCKED |
| DEPLOYER_OBLIGATIONS | READY | BLOCKED |
| HIGH_RISK_PROVIDER | READY | BLOCKED |
| CONFORMITY | READY | BLOCKED |
| GPAI | READY / official guidance registered | BLOCKED |

## Valid acceptance contract

A workstream only closes after receipt and validation of evidence containing at minimum:

1. named reviewer;
2. verifiable qualification/registration and jurisdiction;
3. defined scope;
4. independence/conflict declaration;
5. exact reviewed product SHA/version;
6. evidence package identity/digest;
7. findings and required remediation;
8. limitations/reliance boundary;
9. disposition/decision;
10. attributable signature or equivalent approval;
11. review date;
12. validity/expiry or material-change triggers where appropriate.

Missing mandatory fields keep the workstream `BLOCKED`.

## Current critical path

1. Resolve the single authoritative NIF/NIPC and remaining genuine founder/operator facts.
2. Assign verified qualified reviewer(s) to the eight workstreams.
3. Freeze an exact review SHA and evidence package digest.
4. Receive review findings and dispositions.
5. Remediate repository-controlled findings in controlled PRs.
6. Re-review changed packages where required.
7. Accept and record all eight qualified reviews.
8. Obtain bounded final legal publication/commercial acceptance.
9. Only then promote Terms/Privacy/DPA/Subprocessors and terminal Legal gates to PASS.

## Email boundary

```text
EMAIL_SEND_AUTHORIZED=false
```

Review packs and communications may be drafted. No reviewer outreach is sent without explicit owner authorization.
