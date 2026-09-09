# RISCK COMPLY — GDPR Articles 13/14 Privacy Matrix

Date: 2026-09-09  
Baseline: Regulation (EU) 2016/679, Articles 13 and 14  
Status model: PASS / FAIL / BLOCKED / NOT_APPLICABLE / PENDING_EXTERNAL_REVIEW

This matrix tests the review draft and current public Privacy surface requirement-by-requirement. A route existing is not evidence of completeness.

## Matrix

| Requirement | GDPR | Current source/evidence | State | Gap / closure action |
|---|---|---|---|---|
| Controller identity | 13(1)(a), 14(1)(a) | Privacy review draft identifies SAMUEL CERQUEIRA, UNIPESSOAL LDA for provider-controlled processing | BLOCKED | Registered office and authoritative NIF/NIPC unresolved; entity name usable only in review draft pending registry evidence |
| Controller contact | 13(1)(a), 14(1)(a) | comercial@risckcomply.com verified as reachable intake channel | PASS | Final legal-notice mechanics remain separate |
| DPO contact, if applicable | 13(1)(b), 14(1)(b) | DPO requirement not yet determined | BLOCKED | Complete Article 37 assessment; do not invent DPO |
| Purposes | 13(1)(c), 14(1)(c) | Privacy review draft §§2–4; public Privacy summary | PASS_DOCUMENTED | Keep synchronized with actual product/provider configuration |
| Legal bases | 13(1)(c), 14(1)(c) | Draft lists candidate purposes but legal-basis table is explicitly open | PENDING_EXTERNAL_REVIEW | Complete contract / legitimate interests / consent / legal obligation allocation and balancing tests where applicable |
| Legitimate interests | 13(1)(d), 14(2)(b) | Security, abuse prevention, support and analytics may rely on legitimate interests depending on final allocation | PENDING_EXTERNAL_REVIEW | Record specific interests and balancing assessment before relying on Art. 6(1)(f) |
| Recipients/categories | 13(1)(e), 14(1)(e) | Subprocessor register draft and Trust Center provider list | BLOCKED | Reconcile active Production providers and legal roles before final publication |
| International transfers / safeguards | 13(1)(f), 14(1)(f) | DPA/subprocessor drafts acknowledge unresolved transfer facts | BLOCKED | Build provider-by-provider transfer register and attach account-specific evidence |
| Retention period / criteria | 13(2)(a), 14(2)(a) | Operational retention classes exist but fixed legal periods are intentionally not approved | BLOCKED | Approve factual schedule and provider backup/log retention; avoid invented periods |
| Data-subject rights | 13(2)(b), 14(2)(c) | Draft names access, correction, deletion, restriction, objection, portability and withdrawal where applicable; export/delete controls exist | PASS_DOCUMENTED_PENDING_OPERATIONAL_VALIDATION | Validate end-to-end intake/routing/deadlines and exceptions |
| Withdrawal of consent | 13(2)(c), 14(2)(d) | GDPR operational controls require revocable consent for non-essential analytics where required | PENDING_EXTERNAL_REVIEW | Confirm actual analytics/cookie configuration and consent implementation |
| Complaint to supervisory authority | 13(2)(d), 14(2)(e) | Draft states right to complain to competent supervisory authority | PASS_DOCUMENTED | Lead authority/cross-border establishment position remains subject to entity/establishment review |
| Statutory/contractual requirement and consequences | 13(2)(e) | Not fully mapped publicly | BLOCKED | Identify which account/billing/security fields are mandatory versus optional and consequences of non-provision |
| Automated decision-making/profiling | 13(2)(f), 14(2)(g) | Draft states provider does not intend website/account processing to make solely automated legal/significant decisions | PASS_DOCUMENTED | Revalidate if product/account decisioning changes |
| Categories of personal data for indirect collection | 14(1)(d) | Draft lists categories generally | PASS_DOCUMENTED | Map per indirect source where Article 14 applies |
| Source of personal data | 14(2)(f) | Draft lists users, organisation admins, integrations, payment/auth providers and operational systems | PASS_DOCUMENTED | Add public-source wording if such source is actually used |
| Timing / delivery of Article 14 notice | 14(3) | No operational delivery evidence located in current review | NOT_TESTED | Define when indirect-data notice is delivered or document applicable exception |
| Article 14 exceptions | 14(5) | No exception register | NOT_TESTED | Do not assume an exception; document only where factually applicable |

## Public-page finding

The current public `/[locale]/privacy` route renders the Trust Center Privacy summary. That summary is materially narrower than the review draft and does not itself satisfy the full Articles 13/14 disclosure set.

Therefore:

```text
PRIVACY_REVIEW_DRAFT=SUBSTANTIALLY_MAPPED
PUBLIC_PRIVACY_ART13_14_COMPLETENESS=FAIL
PRIVACY_ART13_14_MAPPING=BLOCKED
```

## Closure sequence

1. resolve legal-entity registry facts;
2. complete controller-side legal-basis mapping;
3. close active-provider recipients/transfers;
4. approve factual retention criteria;
5. complete Article 37 DPO assessment;
6. document mandatory/optional fields and Article 14 delivery/exception logic;
7. validate operational rights handling;
8. reconcile the public Privacy page to the approved matrix;
9. qualified privacy review for mixed-role and material legal-basis conclusions.

No counsel signature is treated as a statutory prerequisite for every row, but material legal interpretation remains external-review work.