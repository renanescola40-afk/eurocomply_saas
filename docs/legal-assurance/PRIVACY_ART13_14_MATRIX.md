# RISCK COMPLY — GDPR Articles 13/14 Privacy Matrix

Date: 2026-09-09  
Baseline: Regulation (EU) 2016/679, Articles 13 and 14  
Status model: PASS / FAIL / BLOCKED / NOT_TESTED / NOT_APPLICABLE / PENDING_EXTERNAL_REVIEW

This matrix tests the review draft and current public Privacy surface requirement-by-requirement. A route existing is not evidence of completeness. Official-source verification is recorded in `GDPR_OFFICIAL_SOURCE_REGISTER_2026-09-09.md`.

## Matrix

| Requirement | GDPR | Current source/evidence | State | Gap / closure action |
|---|---|---|---|---|
| Controller identity | 13(1)(a), 14(1)(a) | Privacy review draft identifies SAMUEL CERQUEIRA, UNIPESSOAL LDA for provider-controlled processing | BLOCKED | Registered office and authoritative NIF/NIPC unresolved; entity name usable only in review draft pending registry evidence |
| Controller contact | 13(1)(a), 14(1)(a) | comercial@risckcomply.com verified as reachable intake channel | PASS | Final legal-notice mechanics remain separate |
| DPO contact, if applicable | 13(1)(b), 14(1)(b) | Article 37/CNPD screening completed; result `DPO_REQUIRED=UNCERTAIN` because scale/sensitive-data facts are incomplete | BLOCKED_APPLICABILITY_FACTS | Resolve factual triggers; do not invent DPO/contact |
| Purposes | 13(1)(c), 14(1)(c) | Privacy review draft §§2–4; RoPA; controller legal-basis matrix; public Privacy summary | PASS_DOCUMENTED | Keep synchronized with actual product/provider configuration |
| Legal bases | 13(1)(c), 14(1)(c) | `CONTROLLER_LEGAL_BASIS_MATRIX.md` now maps candidate basis per provider-controlled processing purpose | PENDING_EXTERNAL_REVIEW | Validate candidate allocation and supporting necessity/obligation facts; candidate map is not final legal approval |
| Legitimate interests | 13(1)(d), 14(2)(b) | Candidate Art. 6(1)(f) activities are isolated in the legal-basis matrix | BLOCKED_LIA | Complete attributable legitimate-interest assessments before relying on Art. 6(1)(f) |
| Recipients/categories | 13(1)(e), 14(1)(e) | Subprocessor review draft, Trust Center provider list, RoPA | BLOCKED_PROVIDER_FACTS | Reconcile exact active Production providers, roles and account contracts |
| International transfers / safeguards | 13(1)(f), 14(1)(f) | `INTERNATIONAL_TRANSFER_REGISTER.md` now maps every known provider candidate and Chapter V decision states | BLOCKED_PROVIDER_EVIDENCE | Attach account-specific locations/DPA/adequacy/SCC/TIA evidence; 2021/915 Art. 28 clauses are not used as transfer SCCs |
| Retention period / criteria | 13(2)(a), 14(2)(a) | `RETENTION_SCHEDULE.md` maps classes, triggers and deletion paths without invented fixed periods | BLOCKED_PERIODS_PROVIDER_FACTS | Approve factual periods/criteria and provider backup/log retention |
| Data-subject rights | 13(2)(b), 14(2)(c) | Rights matrix; authenticated export/delete controls; technical gap bound to issue #2009 | PASS_DOCUMENTED_PENDING_OPERATIONAL_VALIDATION | Close deadline/restriction/objection/controller-routing implementation and exact-SHA evidence |
| Withdrawal of consent | 13(2)(c), 14(2)(d) | Legal-basis matrix isolates optional analytics/marketing consent/configuration question | BLOCKED_CONFIGURATION | Confirm actual analytics/cookie/marketing configuration and prove withdrawal/suppression behavior |
| Complaint to supervisory authority | 13(2)(d), 14(2)(e) | Draft states right to complain to competent supervisory authority | PASS_DOCUMENTED | Lead authority/cross-border establishment position remains subject to entity/establishment review |
| Statutory/contractual requirement and consequences | 13(2)(e) | Not fully mapped publicly | BLOCKED | Identify which account/billing/security fields are mandatory versus optional and consequences of non-provision |
| Automated decision-making/profiling | 13(2)(f), 14(2)(g) | Draft states provider does not intend website/account processing to make solely automated legal/significant decisions | PASS_DOCUMENTED | Revalidate if product/account decisioning changes |
| Categories of personal data for indirect collection | 14(1)(d) | Draft and RoPA list categories generally | PASS_DOCUMENTED | Map per indirect source where Article 14 applies |
| Source of personal data | 14(2)(f) | Draft lists users, organisation admins, integrations, payment/auth providers and operational systems | PASS_DOCUMENTED | Add public-source wording if such source is actually used |
| Timing / delivery of Article 14 notice | 14(3) | No operational delivery evidence located in current review | NOT_TESTED | Define when indirect-data notice is delivered or document applicable exception |
| Article 14 exceptions | 14(5) | No exception register | NOT_TESTED | Do not assume an exception; document only where factually applicable |

## Public-page finding

The current public `/[locale]/privacy` route renders the Trust Center Privacy summary. That summary is materially narrower than the review draft and does not itself satisfy the full Articles 13/14 disclosure set.

Therefore:

```text
OFFICIAL_SOURCE_MAPPING=PASS
PRIVACY_REVIEW_DRAFT=SUBSTANTIALLY_MAPPED
CONTROLLER_PURPOSE_BASIS_STRUCTURE=PASS_PRE_REVIEW
TRANSFER_STRUCTURE=PASS_PRE_REVIEW
RETENTION_STRUCTURE=PASS_PRE_REVIEW
PUBLIC_PRIVACY_ART13_14_COMPLETENESS=FAIL
PRIVACY_ART13_14_MAPPING=BLOCKED_FINAL_FACTS_AND_REVIEW
```

## Closure sequence

1. resolve legal-entity registry facts;
2. validate controller-side legal bases and complete legitimate-interest assessments;
3. close active-provider recipients/transfers with account evidence;
4. approve factual retention criteria/provider rotation;
5. resolve Article 37 factual triggers;
6. document mandatory/optional fields and Article 14 delivery/exception logic;
7. close rights technical handoff #2009 and runtime evidence;
8. reconcile the public Privacy page to the approved matrix;
9. qualified privacy review for mixed-role and material legal-basis conclusions.

No counsel signature is treated as a statutory prerequisite for every row, but material legal interpretation remains external-review work.