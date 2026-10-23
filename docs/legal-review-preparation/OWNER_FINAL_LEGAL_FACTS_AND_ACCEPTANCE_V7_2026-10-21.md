# RISCK COMPLY — Owner Final Legal Facts & Effective Publication Acceptance Pack (V7)

**Status:** INTERNAL OWNER HANDOFF / NOT SUBMITTED / NOT APPROVED / NO SIGNATURE  
**Prepared:** 2026-10-21  
**Owner-designated contracting/selling entity:** SAMUEL CERQUEIRA, UNIPESSOAL LDA  
**Product:** RISCK COMPLY  
**Source evidence:** main 70d3545f414d063379d481fd238aed563e05edda; `config/enterprise-100-closure.json`  
**Control that must remain blocked without acceptance:** `legal-publication` => `artifacts/legal-review/legal-launch-gate.json` => `LEGAL_LAUNCH_ACCEPTED`.

**Integration note:** copied from #2554 `f77ccc1e037dfd37e6acefc0371418483b3e5e74`; the buyer-annex link now points to the single consolidated review schedule. No owner fact, signature or acceptance was completed.

## Objective and authority

This is a private action-ready factual-verification instrument. It does not sign, authorise, submit or assert any company, tax, IP or legal fact. The owner prefers to defer public-company-registry and tax-specific steps until the final administrative stage; legal drafts and buyer conversations may continue with clear disclosure, but **paid public self-service/contract effect must remain fail-closed** until mandatory facts and contracts are ready.

Do **not** put full registry/tax extracts, signatures, personal identification, access codes, credentials, actual corporate banking or privileged lawyer advice into public GitHub history. Store originals in access-controlled company records and reference only a redacted verification record.

## 1. Legal entity and signing authority — owner form

| Field required for the final contract | Owner to insert privately | Evidence / requirement |
| --- | --- | --- |
| Exact commercial-register legal name | [NOT VERIFIED] | Current Portuguese commercial-register extract |
| NIPC / NIF, VAT identity | [NOT VERIFIED] | Current attributable official company/tax record; do not infer from earlier drafts |
| Registered office and notices address | [NOT VERIFIED] | Current registered office, not merely marketing/contact address |
| Current managers / authorised signatories | [NOT VERIFIED] | Registry representation authority or lawful delegation |
| Company legal purpose / object | [NOT VERIFIED] | Registered object and current statutes |
| Software/SaaS activity / correct CAE-Rev.4 | [NOT VERIFIED] | AT/INE and actual service description, accounting/registry review as applicable |
| Actual VAT/IVA status, cross-border B2B rules | [NOT VERIFIED] | AT/accountant determination |
| Stripe LIVE merchant identity and invoice seller | [NOT REVALIDATED IN THIS WORKSTREAM] | Match seller and tax/invoicing authority only after company facts confirmed |

**Official self-service:** 
- Existing certidão: https://registo.justica.gov.pt/Empresas/Consultar-Certidao-Permanente (current code required).
- Request a current certificate if none is active: https://registo.justica.gov.pt/Empresas/Pedir-Certidao-Permanente
- AT guidance for CAE reclassification: https://info.portaldasfinancas.gov.pt/pt/destaques/Paginas/Validacao_CAE.aspx
- INE CAE converter: https://webinq.ine.pt/Cae?cae=62100&ver=2
- EU VIES identity verification if applicable: https://ec.europa.eu/taxation_customs/vies/

**Specific 2026 CAE warning:** Portugal now uses **CAE-Rev.4**, effective from 2025-01-01. The former **Rev.3 62010** (programming) maps to **Rev.4 62100**. This is a *classification mapping*, **not evidence that 62100 is definitively the correct sole/main code for this company's actual subscription/SaaS business**. Identify actual activity, licensing versus development and other relevant activities; verify registered CAE(s), company object and tax implications with AT/qualified accountant, and any IRN action required by the company-object rules. Do not automatically file or assume an amendment is already done.

## 2. IP chain of title — seller must have rights it actually transfers

Prepared repository provenance and assets (not title proof) are tracked in:
- `docs/ma-diligence/IP_CHAIN_OF_TITLE_EVIDENCE_PACK.md`
- `docs/ma-diligence/ASSET_TITLE_REGISTER.md`
- `docs/ma-diligence/CREATOR_CONTRIBUTOR_REGISTER.md`
- `docs/ma-diligence/IP_OWNERSHIP_MASTER.md`.

**Required factual closing decisions:**

| Asset | Required verification or instrument | Acceptance |
| --- | --- | --- |
| Creator-developed code, documentation, designs | Identify creator, scope, contribution dates, prior arrangements and lawful creator-to-seller rights assignment or licence | No 100% seller-title claim without sufficient executed documentation |
| Contractors and other contributors | Identify material contributors and legal basis of their contribution/IP transfer, third-party rights | Contributor chain evidenced |
| Domain and branding | Registrar title/control, branded material provenance, registered mark status if any | Owner/registrar/IP evidence |
| Dependency libraries and third-party content | SBOM/OSS licences, notices, fonts/graphics, third-party service restrictions | Third-party materials carved out from 100% ownership claim |
| Existing cloud, CI, customer content and provider accounts | Provider contract and security/privacy handover rules | Administrative control is not itself IP title; customer data is not freely assignable |

The creator-to-company relationship must be established truthfully. **Neither a GitHub commit history, an internal memo, the owner's verbal authorisation, nor this form substitutes for a legally sufficient transfer/licence or other lawful basis.** Qualified Portuguese IP counsel should review the transaction where necessary; no deed/signature is fabricated.

## 3. Data protection and provider facts — freeze for each proposed customer agreement

| Final fact | Evidence required | State |
| --- | --- | --- |
| Buyer and seller personal-data roles | Feature-level controller/processor role analysis | OPEN |
| Article 28 DPA and processing annex | Specific entities, exact version, relevant service modules, categories and instructions | REVIEW DRAFT / NOT SIGNED |
| Live subprocessors and account entity | Supplier dashboards and current applicable DPAs/terms | OPEN FOR SOME ACCOUNTS |
| Storage, access and Chapter V transfers | Exact production data-flow, importer location and lawful instrument, plus assessment if required | PARTIAL |
| Supplier-backed retention, deletion and backups | Tenant data, log, archive and backup facts per provider | PARTIAL |
| Optional analytics/cookies | Actual enabled PostHog/analytics project plus consent/configuration and retention verification | OPEN |
| Incident and breach duties | Real escalation contacts and response operations consistent with Article 33 | DOCUMENTED, FINAL CONTRACT OPEN |
| DPO/DPIA requirement | Case-based statutory screening, not automatic universal appointment | SCREENING AND SIGNOFF OPEN |

Linked proposed buyer annex: `docs/legal-review-preparation/legal-pack/ENTERPRISE_DATA_PROCESSING_SECURITY_SCHEDULE_V7_REVIEW_DRAFT.md`.

### Personal-data breach workflow

Where RISCK COMPLY acts as **processor**, give the customer/controller notice without undue delay after awareness, with available facts and updates. Where it acts as **controller**, assess notifying CNPD within the GDPR's 72-hour period when required; keep a breach record regardless of notification. Data-subject notification under Article 34 is a separate risk-based obligation.

## 4. Effective-contract assembly decision (nine factual control lines)

Complete these fields only after evidence is collected:

| Mandatory internal legal-launch topic | Proof that must exist | This-run determination |
| --- | --- | --- |
| AI Act applicability | Current role/system-intended-purpose analysis; 2026/1744 deadline mapping | REVIEW MATERIAL PRESENT; legal case acceptance OPEN |
| Controller/processor allocation | Attributable role and data-flow matrix | PARTIAL |
| Privacy notice/lawful bases | Final company identity, basis, purposes, recipients, rights and retention | REVIEW PRESENT / EFFECTIVE OPEN |
| Article 28 DPA | Complete agreed annexes and valid incorporation/acceptance | DRAFT PRESENT / EXECUTION OPEN |
| Subprocessors/international transfers | Relevant provider legal parties, regions/access, SCC/adequacy where needed | PARTIAL |
| Retention/DSR/breach | Supported lifecycle, cases, operations and contractual wording | PARTIAL |
| DPO/DPIA applicability | Dated reasoned screening for actual processing activities | INTERNAL STRUCTURE / SIGNOFF OPEN |
| Cookies/ePrivacy/analytics/marketing | Actual tracker inventory, consent choices and effective notices where necessary | REVIEW / PROVIDER FACTS OPEN |
| Terms/publication | Registered seller, tax/billing consistency, accepted terms, effective dates, live clickwrap/version proof | FAIL-CLOSED / NOT EFFECTIVE |

These match the nine control IDs in `scripts/compliance/check-legal-launch-gate.mjs`. Qualified review for the additional eight legal packages may be required by the canonical legal gate when documented applicability says so. Do **not** create a false green JSON file, invent counsel qualifications or use unsupported N/A determinations to force passage.

## 5. Proposed owner and company legal sign-off record (leave blank until real act)

- Prepared document versions and checksums: [TO BE FILLED]
- Company identity and extract verification date: [TO BE FILLED]
- Processor and vendor final annex check: [TO BE FILLED]
- Product/deployment SHA and legal-page runtime check: [TO BE FILLED]
- Qualified legal review applicable? [YES/NO WITH RECORDED RATIONALE]
- If yes, reviewer identity, independence, qualification, opinion and attributable signature: [REAL ARTIFACT ONLY]
- Signing company officer and authority reference: [REAL ARTIFACT ONLY]
- Final public Terms version and effective date: [TO BE FILLED]
- Final Privacy Notice version and effective date: [TO BE FILLED]
- Final customer DPA version/acceptance mechanism: [TO BE FILLED]
- Owner/company approval and timestamp: [REAL ACT ONLY]
- Final verification result: **NOT ACCEPTED**, until exact-SHA legal gate proves otherwise.

## 6. Unchanged operational red lines

- Customer demos and enterprise procurement discussion may use verified **review** material with limitations.
- Do not publish Terms/Privacy as legally effective based only on an internal draft or this fact collection.
- Do not enable public paid checkout solely to change an Enterprise status indicator.
- No invented ISO 27001/SOC 2 certifications, third-party retest acceptance, enterprise guaranteed availability or universal EU-only data residency.
- Owner authority does not make another person's legal sign-off, a registry change or a customer contract occur.
- No mail, external provider message, tax filing, registry action, Stripe KYC change, signature or external submission was performed by this package.

## 7. Source links

- Official Portuguese company certificate service: https://www2.gov.pt/pt/servicos/consultar-a-certidao-permanente-de-registo-comercial
- Official AT CAE update notice: https://info.portaldasfinancas.gov.pt/pt/destaques/Paginas/Validacao_CAE.aspx
- Portuguese Decree-Law 9/2025: https://diariodarepublica.pt/dr/detalhe/decreto-lei/9-2025-907097147
- Official INE conversion: https://webinq.ine.pt/Cae?cae=62100&ver=2
- CNPD breach duty: https://www.cnpd.pt/organizacoes/outras-obrigacoes/violacao-de-dados-ou-data-breach/
- Consolidated AI Act: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02024R1689-20260727

```text
OWNER_FINAL_LEGAL_FACTS_PACK=PREPARED
VERIFIED_COMPANY_REGISTRY_AND_VAT_FACTS=NOT_RECEIVED_IN_THIS_WORKSTREAM
IP_CHAIN_OF_TITLE=NOT_EXECUTED_OR_VERIFIED_IN_THIS_WORKSTREAM
FINAL_DPA_AND_PUBLIC_TERMS=REVIEW_NOT_EFFECTIVE
PRODUCTION_PUBLIC_CONTRACT_EFFECT=NOT_CLAIMED
LEGAL_LAUNCH_ACCEPTED=NO
MAIL_SENT=0
EXTERNAL_SUBMISSIONS=0
```
