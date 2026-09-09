# RISCK COMPLY — Legal + EU AI Act Qualified Assurance Closure Status

Date: 2026-09-09  
Mode: `LEGAL_EU_AI_ACT_QUALIFIED_ASSURANCE_CLOSURE_V1`

## Terminal truth

```text
AI_IMPLEMENTATION=100_PERCENT_ON_REVIEW_BRANCH
AI_ACT_QUALIFIED_COMPLETION=0/8_ACCEPTED
QUALIFIED_REVIEW_STAGE_REMAINING=100_PERCENT
QUALIFIED_REVIEW_WEIGHT_REMAINING=51/100
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
PR_2005=OPEN_HUMAN_APPROVAL_REQUIRED
CANONICAL_REVIEW_SHA=NOT_FROZEN
EXACT_SHA_RUNTIME_CREDIT=NOT_YET_AVAILABLE
EU_AI_ACT_PRODUCT_COVERAGE_GO=BLOCKED
LEGAL_FINAL=BLOCKED
ENTERPRISE_100=NO
```

No software check, AI-generated opinion, CI result, internal self-review or synthetic signature can change the eight qualified workstreams to PASS.

## Percentage interpretation

The canonical product-coverage model assigns:

- **49/100 points** to implementation, CI and exact-SHA runtime evidence that can be closed through engineering/operations;
- **51/100 points** to the eight qualified human review workstreams.

On the current unmerged PR SHA, implementation and CI can reach 100%, but exact-SHA Production runtime cannot be credited before the protected PR is approved, merged and deployed. Therefore a pre-merge exact-SHA product-coverage artifact can truthfully report `completedCoverage=0` even though implementation is complete.

After the canonical merge/deploy/runtime proof closes, the irreducible remaining product-coverage weight is **51%**, representing the eight genuine qualified reviews.

The qualified-review stage itself remains **0/8 accepted = 0% complete = 100% remaining**.

## Protected-branch approval gate

A merge attempt for PR #2005 was rejected by repository protection because:

```text
REQUIRED_APPROVING_REVIEW=1
APPROVER_REQUIRES_WRITE_ACCESS=true
APPROVER_MUST_DIFFER_FROM_LAST_PUSHER=true
```

This control is intentionally not bypassed. An AI/bot approval is not substituted for the required independent repository review.

## Exact-SHA alignment gate

Last live reconciliation showed Production on an earlier release while `main` and the legal review branch had advanced. The legal branch has since been synchronized with the then-current `main` and continues to receive controlled corrections.

Required sequence before external legal assignment:

1. obtain the required independent GitHub approval for PR #2005;
2. merge the approved branch;
3. establish the resulting canonical `main` SHA;
4. deploy and verify that exact SHA in Production;
5. generate the qualified-review handoff bundle on that exact SHA;
6. freeze the evidence-package digest;
7. only then assign the eight qualified reviews.

Any returned opinion bound to a different SHA remains non-creditable until re-review.

## Work completed in this closure pass

### 1. Official AI Act source refresh

The legal-source register is on baseline `2026-09-09.1` and was verified on 2026-09-09.

Current binding-law timeline retained in the product rule registry:

- general AI Act application and Article 50 transparency obligations: **2026-08-02**;
- Article 5 additions introduced by Regulation (EU) 2026/1744: **2026-12-02**;
- qualifying Article 50(2) transition for pre-existing provider systems: until **2026-12-02**;
- Annex III / Article 6(2) high-risk rules: **2027-12-02**;
- Annex I / Article 6(1) high-risk product rules: **2028-08-02**.

Official Commission guidance and voluntary Codes of Practice remain explicitly non-binding.

### 2. Legal baseline drift closed

The runtime registry, official-source register, counsel Article × Function × Evidence matrix and compliance evidence registry are reconciled to:

```text
LEGAL_BASELINE_VERSION=2026-09-09.1
VERIFIED_DATE=2026-09-09
```

A test now fails if these baselines diverge again.

### 3. Public/commercial claim safety

The sales and pricing sources were reconciled with current runtime truth:

- Essential: €49/month self-serve;
- Professional: €149/month self-serve;
- Business: €399/month assisted sales;
- Enterprise: from €990/month, final pricing by contract;
- **no free trial is currently offered**;
- tax/VAT claims remain fact-dependent;
- no guaranteed-compliance, certification or regulator-approval claim is permitted without evidence.

### 4. Founder/company identity fail-closed

The following remain usable as owner-supplied review facts:

- legal entity name: `SAMUEL CERQUEIRA, UNIPESSOAL LDA`;
- brand: RISCK COMPLY;
- website: https://www.risckcomply.com.

The owner-supplied Lisboa address is now treated only as a **correspondence/operating address pending authoritative registry confirmation**. It is not represented as the registered office/sede social.

The NIF/NIPC remains blocked because conflicting historical values exist. No value is selected by inference.

Therefore:

```text
REGISTERED_OFFICE=BLOCKED_OFFICIAL_REGISTRY_CONFIRMATION
NIF_NIPC=BLOCKED_AUTHORITATIVE_CONFIRMATION
```

### 5. Terms / Privacy / DPA truth boundary

Terms, Privacy and DPA remain `REVIEW_DRAFT`. They now explicitly require authoritative confirmation of both registered office/legal address and NIF/NIPC before publication/signature.

### 6. Retention claim corrected

The Retention Center no longer represents static target periods as proven Enterprise retention enforcement.

Current truth:

```text
RETENTION_TARGETS=DRAFT
RETENTION_ENFORCEMENT=NOT_PROVEN
RETENTION_ENTERPRISE_READY=0/8_CATEGORIES
RETENTION_READINESS=0_PERCENT
```

Approval and attributable enforcement/provider evidence are required before retention commitments can become contractual.

### 7. Live provider facts refreshed

The Subprocessor review draft distinguishes observed provider/runtime facts from contractual/legal conclusions. Vercel and Supabase live facts were refreshed; DPA acceptance, transfer mechanisms, complete processing locations, retention and legal role remain separate gates.

### 8. Qualified review packages

Eight canonical review-package tracks exist with total qualified-review weight **51**:

| Workstream | Weight | Preparation | Human acceptance |
|---|---:|---|---|
| LEGAL_RULES | 4 | READY | BLOCKED |
| ARTICLE_5 | 7 | READY | BLOCKED |
| ARTICLE_50 | 8 | READY | BLOCKED |
| FRIA | 6 | READY | BLOCKED |
| DEPLOYER_OBLIGATIONS | 7 | READY | BLOCKED |
| HIGH_RISK_PROVIDER | 9 | READY | BLOCKED |
| CONFORMITY | 5 | READY | BLOCKED |
| GPAI | 5 | READY | BLOCKED |

```text
QUALIFIED_REVIEWER_ASSIGNMENTS_ACCEPTED=0/8
AI_ACT_QUALIFIED_COMPLETION=0_PERCENT
QUALIFIED_REVIEW_WEIGHT_ACCEPTED=0/51
```

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

1. complete PR #2005 CI on the latest head;
2. obtain the required independent write-access GitHub approval;
3. merge PR #2005;
4. deploy and prove the exact resulting canonical SHA;
5. confirm registered office/legal address and NIF/NIPC from an authoritative source;
6. freeze qualified-review evidence package/digests;
7. appoint verified qualified reviewer(s) for all eight workstreams;
8. receive, validate and remediate findings;
9. re-review changed packages where required;
10. accept and record all eight reviews;
11. obtain final counsel approval for Terms, Privacy, DPA and Subprocessors;
12. only then promote `EU_AI_ACT_PRODUCT_COVERAGE_GO`, `LEGAL_FINAL` and Enterprise Legal gates to PASS.

## Email boundary

```text
EMAIL_SEND_AUTHORIZED=false
```

No reviewer outreach is sent without explicit owner authorization.
