# RISCK COMPLY — Legal Publication & Enterprise Procurement Sign-off Handoff V7

**As of:** 21 October 2026  
**Scope:** legal, GDPR/privacy, customer procurement, company identity, and IP-title dependencies.  
**GitHub baseline:** `main` `70d3545f414d063379d481fd238aed563e05edda`; this V7 branch is documentation-only.  
**Status:** `DRAFTS_UPDATED / EFFECTIVE_LEGAL_LAUNCH_NOT_PROVEN / NO_EXTERNAL_ACTIONS`.

## 1. Concrete documents delivered in V7

1. `docs/legal-review-preparation/legal-pack/ENTERPRISE_DATA_PROCESSING_SECURITY_SCHEDULE_V7_REVIEW_DRAFT.md`: detailed proposed processing specifications, TOMs, supplier disclosure, lifecycle, incidents and contract-specific inputs.
2. `docs/legal-review-preparation/legal-pack/EU_AI_ACT_GDPR_APPLICABILITY_MATRIX_V7_REVIEW_DRAFT.md`: updated 2026 AI Act milestones, system-/role-dependent responsibilities, GDPR matrix and change triggers.

These **supplement** but do not supersede the canonical Terms, Privacy Notice, DPA, MSA, Order Form, register and Trust Center. No signed agreements, regulatory submissions, professional endorsements or production changes have occurred.

## 2. Exact legal publication control: what must actually pass

Canonical control: `config/enterprise-100-closure.json` → `legal-publication`.  
Required genuine evidence: `artifacts/legal-review/legal-launch-gate.json` with status `LEGAL_LAUNCH_ACCEPTED`.  
Script: `scripts/compliance/check-legal-launch-gate.mjs`; expected exact-SHA binding.

The source checker requires a structured `legal-launch-readiness` record with **nine** unique mandatory domain decisions, plus founder facts, validated repository/counsel material, a master legal decision and any required qualified review. File existence is not a PASS.

| Mandatory domain | Prepared documentation | Still to be evidenced for legal launch |
| --- | --- | --- |
| `ai-act-applicability` | Legal rules, V7 matrix, article/function map | Current exact-release scope and role determination; qualified review when needed |
| `controller-processor-roles` | DPA/ROPA/V7 specification | Approved flow-by-flow role allocation; final supplier identity |
| `privacy-notice-lawful-bases` | Privacy review + Arts 13/14 map | Verifiable controller facts, lawful bases/recipient/retention consistency, publication approval |
| `article-28-dpa` | DPA draft, control matrix, V7 annex | Final parties/schedules, sufficient guarantees, effective execution/incorporation |
| `subprocessors-international-transfers` | Provider register + transfer register | Account-level legal entities/flows, relevant Chapter V mechanisms, annex authorisation |
| `retention-dsr-breach` | Retention policy, DSR runbooks, incident process | Current provider backup/log lifecycles and final timing/contract language |
| `dpo-dpia-applicability` | DPO/DPIA screening and matrices | Signed-off statutory trigger decision and customer-specific distinction |
| `cookies-eprivacy-analytics-marketing` | Cookie review + analytics inventory | Verified deployed cookie/consent behavior and effective notice |
| `commercial-terms-publication` | Terms, MSA, Order Form, service schedule | Registry/fiscal facts, approved exact versions, effective publication/clickwrap validation |

**Never** populate a JSON acceptance decision with a placeholder reviewer, fake signature, guessed date, copied SHA, or unsupported `NOT_APPLICABLE`.

## 3. Definitive P0 external fact register (defer administrative acts until final stage as owner requests)

| Gate | Minimum admissible evidence | Owner action | Current decision |
| --- | --- | --- | --- |
| Contracting seller identity | Current attributable Portuguese company register/certificate, registered office, NIPC, company officer/representation | Retrieve/access official company certificate and place authoritative evidence in a restricted data room | PENDING; don't publish assumed fields |
| Corporate software activity and tax | Company purpose/CAE position, AT/accountant determination of VAT/IVA, VIES if applicable, invoice fields | Confirm actual CAE/activity and fiscal treatment; submit amendment only when required and authorised | PENDING; no filing or fee |
| Software/IP ownership | Creator/contributor rights schedule; legally sufficient assignment/licence or other documented lawful ownership chain; domain/brand provenance; OSS exceptions | Qualified drafting/execution as required with authorised company/creator | PENDING; cannot claim seller owns 100% software/IP |
| Provider/transfer/retention disclosures | Account-specific provider agreements/settings, roles, actual transfer/backup/log data map | Get attributable provider account exports/contract facts, not a generic marketing page | PARTIAL; no blanket EU-only/DPA-effective statement |
| Approved effective customer documents | Exact final Terms, Privacy, MSA, DPA/annexes, Order Form, authorised approval, acceptance/incorporation evidence | Lawful company signoff and counterparty acceptance where applicable | PENDING; no signature created |

### Official self-service routes (informational only)

- Portuguese company certificate **consult** (free with active code): https://registo.justica.gov.pt/Empresas/Consultar-Certidao-Permanente
- Company certificate **request** (chargeable; not requested/submitted here): https://registo.justica.gov.pt/Empresas/Pedir-Certidao-Permanente
- Portuguese company records / FCPC information: https://www.gov.pt/guias/empresa-online-servicos-do-registo-comercial
- Intra-EU VAT validity (VIES): https://europa.eu/youreurope/business/finance-and-tax/vat/check-vat-number-vies/index_en.htm

The company certificate service may require payment for a new certificate. **No payment, registration, tax amendment or external submission was attempted.** Do not store identification documents, tax records, private credentials, live provider tokens or personal signatures in GitHub.

## 4. Production claims guard for procurement responders

| Buyer question | Safe current answer |
| --- | --- |
| Has an Article 28 DPA been prepared? | Yes, **review draft** with internal processing/security annex; not yet an executed customer DPA. |
| Is the service compliant with every AI Act obligation? | No blanket claim. It supports workflows, while customer-specific roles and legal obligations remain with their responsible parties. |
| Do you offer independent security assurance? | Third-party black-box web assessment dated 12 Sep 2026 exists; specific TLS remediations have evidence; clean terminal independent retest remains pending. |
| Is SOC 2/ISO 27001 certified? | No certification/report currently claimed. |
| Is the data EU-only? | No. Supabase primary region previously evidenced in Ireland; other providers may have non-EEA processing or access. |
| Can you promise a percentage SLA, 24/7 support, precise RPO/RTO? | Not without signed, technically validated customer-specific terms. Default owner position: no contractual uptime percentage or service credits. |
| Does supplier own all IP? | Not proven. Repo operational control exists; creator-to-seller chain and other asset title remain open. |
| Can paid self-service contracts be enabled now? | Canonical records leave public legal surfaces as review drafts and payment legal gate fail-closed. Do not bypass without valid legal acceptance. |

## 5. Review and release workflow (no automatic publication)

1. Review V7 drafts against canonical `main` source, current provider account facts and exact production SHA.
2. Resolve internal contradictions and stale assertions **without creating false acceptance evidence**.
3. Obtain only genuinely required qualified legal judgments, especially role/transfer/IP/contract mechanics and AI Act edge cases.
4. In final administrative phase obtain authoritative company/CAE/tax/invoice facts and title-chain documents.
5. Produce approved **exact-version** contract set; validate clickwrap/Order Form execution mechanism and privacy publication.
6. Execute existing legal validation/test scripts; retain real exact-SHA artifacts and the actual checker decision.
7. Promote to `LEGAL_LAUNCH_ACCEPTED` **only if** the checker and authorised legal publication process genuinely pass.
8. Keep external buyer-specific acceptance and independent security assurance separate from document drafting.

## 6. Percentage reporting — precise denominators

- **Document-family coverage:** `10/10 = 100%` family presence per existing V13/V14 repository inventory. Does not mean quality, currency, legal validity or buyer acceptance.
- **V7 scoped deliverables:** `2/2 = 100%` *new files prepared for review* in this branch; **not** an acceptance score.
- **Enterprise legal-publication terminal control:** `0/1 confirmed as accepted in this review = 0% verified acceptance`. The accepted artifact was **not demonstrated** in the inspected `main` repository tree. This is a verification boundary, not proof that no external record can exist; check governed CI/artifact store before deciding final production state.
- **Entire Enterprise 100:** **NOT CALCULABLE HERE**, because the other 15 controls belong to other lanes and require exact-SHA direct evidence.

## 7. External action ledger (this V7 session)

```text
GITHUB_DOCUMENTATION_WRITES=YES
MAIN_BRANCH_CHANGED=NO
PRODUCTION_CHANGED=NO
EXTERNAL_EMAILS_OR_MESSAGES_SENT=0
GOVERNMENT_FILINGS=0
PAYMENTS=0
SIGNED_CONTRACTS=0
INDEPENDENT_REVIEW_IMPERSONATION=NO
LEGAL_PUBLICATION_PASS_CLAIMED=NO
```

### Primary official sources

- EU Council amended AI Act calendar: https://www.consilium.europa.eu/en/policies/artificial-intelligence-act/timeline-artificial-intelligence/
- Regulation (EU) 2016/679: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Decision (EU) 2021/915: https://eur-lex.europa.eu/eli/dec_impl/2021/915/oj/eng
- EDPB processor/subprocessor opinion: https://www.edpb.europa.eu/news/edpb-adopts-opinion-on-processors-guidelines-on-legitimate-interest-statement-on-draft_en
