# RISCK COMPLY — Official Document Request List

Date: 2026-10-05  
Seller: SAMUEL CERQUEIRA, UNIPESSOAL LDA  
Status: `OFFICIAL_EVIDENCE_REQUEST_PACK=PASS / DOCUMENTS_NOT_YET_CREDITED`

Do not treat this checklist as the documents themselves.

| Document | Issuer/source | Why required | How to obtain | Validity / freshness target | Owner | Status |
|---|---|---|---|---|---|---|
| Permanent commercial registration certificate | Instituto dos Registos e do Notariado / commercial registry | Legal name, registration, managers, registered office, pending filings | Request online via Portuguese registry service | Official service offers 1–4 year certificate validity; for M&A refresh near signing/closing | Seller | OFFICIAL_DOCUMENT_REQUIRED |
| Permanent registration + documents certificate | IRN | Underlying filed corporate documents | Request online | Use current certificate during diligence | Seller | OFFICIAL_DOCUMENT_REQUIRED |
| Current memorandum/articles certificate | IRN | Corporate object, governance, authority restrictions | Request online | Current version; refresh if amended | Seller | OFFICIAL_DOCUMENT_REQUIRED |
| FCPC registration certificate / company card evidence | IRN / RNPC/FCPC route | NIPC, name, registered office, CAE, legal form/object where shown | Official online service | Current at diligence date | Seller | OFFICIAL_DOCUMENT_REQUIRED |
| RCBE proof / consultation | RCBE / Justiça | Beneficial owners/control | Authenticate/consult or retain submission proof | Refresh close to signing/closing and after ownership changes | Seller | OFFICIAL_DOCUMENT_REQUIRED |
| Tax debt/non-debt certificate | Autoridade Tributária | Tax good-standing evidence | Portal das Finanças > Certidão > Dívida e não dívida | **3 months** under current AT guidance | Seller/accountant | OFFICIAL_DOCUMENT_REQUIRED |
| VIES validation | European Commission VIES | Point-in-time intra-EU VAT validation | Validate official VAT number in VIES and retain dated result | Point-in-time; refresh near closing | Seller/accountant | OFFICIAL_DOCUMENT_REQUIRED |
| VAT registration/activity evidence | Autoridade Tributária | VAT regime and activity/CAE reconciliation | Portal das Finanças / accountant | Current at closing | Accountant | ACCOUNTANT_REQUIRED |
| IES / annual accounts certificates | IRN / accounting records | Historical financial statements | Registry certificate and accountant records | Latest filed years + current management accounts | Accountant | ACCOUNTANT_REQUIRED |
| Corporate tax returns/assessments | AT / accountant | Tax diligence | Accountant/Portal das Finanças | Statutory periods requested by buyer | Accountant | ACCOUNTANT_REQUIRED |
| Social-security good-standing evidence | Segurança Social, if requested | Payroll/social contribution diligence | Official portal | Buyer/counsel freshness requirement | Seller/accountant | BUYER_SPECIFIC |
| Bank statements | Seller's bank | Cash/debt/payment verification | Controlled bank export | Latest month and transaction cut-off | Seller/accountant | OFFICIAL_DOCUMENT_REQUIRED |
| Domain registrar ownership/control export | Registrar | Domain title/control | Registrar account export/screenshot with secrets redacted | Current at signing | Seller | PROVIDER_REQUIRED |
| Trademark registration/filing extract, if any | INPI/EUIPO/WIPO as applicable | Brand title | Official registry extract | Current at signing | Seller/counsel | OFFICIAL_DOCUMENT_REQUIRED_OR_NOT_CLAIMED |
| Creator/contractor IP assignments | Executed private legal documents | Chain of title | Locate or execute counsel-approved instruments | Must be effective before seller title representation/closing | Seller/counsel | IP_CHAIN_GAP |
| Board/shareholder sale approval | Seller corporate records | Authority to transact | Counsel-drafted resolution if required | Transaction-specific | Seller/counsel | LAWYER_REQUIRED |
| Signatory authority / power of attorney | Registry/corporate records | Valid signing | Registry evidence / resolution / POA | Current at signing | Seller/counsel | OFFICIAL_DOCUMENT_REQUIRED |
| Provider account ownership/billing exports | Vercel/Supabase/Stripe/etc. | Transfer/handover diligence | Provider consoles/contracts/invoices | Current at signing | Seller | PROVIDER_REQUIRED |

## Acquisition rules

- Store sensitive official documents in a controlled data room, not the public repository.
- In this repository keep only the index, request status, non-secret metadata, date and optionally a digest.
- Redact personal data not needed for buyer diligence.
- Never upload access codes, passwords, API keys, bank credentials or authentication secrets.
- Refresh time-sensitive documents immediately before signing/closing if buyer/counsel requires it.

## Official-source reference notes

- Portuguese permanent commercial certificates provide current registration information and are available in registration, registration+documents, articles and annual-accounts variants.
- RCBE is the official Portuguese beneficial-owner register and can generate consultation/submission proof.
- AT's debt/non-debt certificate proves tax status and is currently stated by AT to be valid for 3 months.
- VIES is the European Commission's point-in-time VAT validation tool; retain the dated validation result.

```text
OFFICIAL_DOCUMENT_REQUEST_LIST=PASS
OFFICIAL_DOCUMENTS_CREDITED_IN_THIS_REPOSITORY=0
OFFICIAL_EVIDENCE_READINESS=0_PERCENT
```
