# RISCK COMPLY — M&A IP AND ASSET PERIMETER V1
Date: 2026-10-14
Status: DRAFT / INTERNAL DILIGENCE / NOT EXECUTED
Repository: renanescola40-afk/eurocomply_saas
Seller designated in existing M&A files: SAMUEL CERQUEIRA, UNIPESSOAL LDA
Transaction hypothesis: software/IP and associated product asset sale; not an automatic sale of the seller's shares or unrelated businesses.
Production and DataGuard demo: READ ONLY / NO ACTION AUTHORIZED.

## 0. Authority, limitations and evidence legend
This is a draft transaction working paper, not legal advice, a legal title opinion, certification, contract, executed asset transfer, buyer acceptance or representation of provider transferability. No live systems were modified. Repository path evidence confirms that artifacts exist; it does not prove the seller owns each right. Historical files may be stale; reverify exact main and deployment SHA at closing.

Statuses: EVIDENCE_VERIFIED = narrowly supported observed fact; DRAFT_COMPLETE = internally prepared template/schedule; LEGAL_REVIEW_REQUIRED = professional decision pending; SIGNATURE_REQUIRED = actual executed evidence missing; THIRD_PARTY_CONSENT_REQUIRED = permission or eligibility to be assessed, not presumed granted; OPEN = material evidence absent; NOT_APPLICABLE = established with affirmative evidence.

Key baseline references:
- docs/ma/buyer-materials/RISCK_COMPLY_TRANSACTION_PERIMETER.md
- docs/trust/M_AND_A_IP_SOFTWARE_DILIGENCE_INDEX.md
- docs/ma/FINAL_SALE_READINESS_CONTROL_TOWER.md
- docs/ma-diligence/SELLER_DATA_ROOM_MASTER_SCORECARD.md
- docs/ma-diligence/M_AND_A_REQUIREMENT_STATUS_MATRIX.md
- docs/ma-diligence/PROVIDER_TRANSFER_MATRIX.md
- docs/ma-diligence/PROVIDER_TRANSFER_CHANGE_OF_CONTROL_REVIEW_2026-10-05.md
- docs/ma/closing/TRANSFER_SCHEDULES.md
- package.json and package-lock.json

## 1. M&A Software Asset Inventory — DRAFT
Columns: ID | Asset | Evidence location | Current controller | Claimed legal owner | Verified legal owner | Delivery/transfer method | Third-party permission | Confidentiality | Inclusion | Missing evidence/status

| ID | Asset | Evidence | Controller | Claimed owner | Verified legal owner | Transfer | Consent | Class | Inclusion | Gap / status |
|---|---|---|---|---|---|---|---|---|---|---|
| A01 | Application source, Next.js/TypeScript | src/, package.json | GitHub repo operator | Seller proposed | NOT VERIFIED | copyright/IP agreement, secure export/repo transfer | GitHub mechanics | HIGHLY_CONFIDENTIAL | PROPOSED | contributor/title instrument; LEGAL_REVIEW_REQUIRED |
| A02 | Backend/server business logic | src/app/, src/ and server-side routes | Repo operator | Seller proposed | NOT VERIFIED | software IP schedule | related SDK licenses | HIGHLY_CONFIDENTIAL | PROPOSED | complete file manifest at locked SHA; OPEN |
| A03 | Frontend/UI/locale assets | src/app/, src/components/, public/ | Repo operator | Seller proposed | NOT VERIFIED | code/design delivery | third-party fonts/images review | CONFIDENTIAL | PROPOSED | provenance/design source; OPEN |
| A04 | AI governance and compliance content | src/, docs/ | Repo operator | Seller proposed | NOT VERIFIED | IP/content assignment subject to applicable rights | external references and terms | CONFIDENTIAL | PROPOSED | authored vs sourced material map; OPEN |
| A05 | Classification, assessments and scoring workflow | src/, tests where present | Repo operator | Seller proposed | NOT VERIFIED | code/docs with IP package | applicable dependencies | HIGHLY_CONFIDENTIAL | PROPOSED | snapshot coverage; OPEN |
| A06 | Database schema and migrations | supabase/migrations/ | Repo operator | Seller proposed | NOT VERIFIED | schema/migration export | Supabase for project movement | HIGHLY_CONFIDENTIAL | PROPOSED | database rights/third-party content; LEGAL_REVIEW_REQUIRED |
| A07 | APIs/integrations | src/app/api/, package.json | Repo operator | Seller proposed | NOT VERIFIED | source and interface handover | provider TOS; credentials NEVER transferred in plaintext | HIGHLY_CONFIDENTIAL | PROPOSED | endpoint/API inventory; OPEN |
| A08 | Security scripts, CI and release tools | scripts/security/, .github/workflows/ | Repo operator | Seller proposed | NOT VERIFIED | code/history/config export | GitHub/third-party integrations | HIGHLY_CONFIDENTIAL | PROPOSED | provenance + secrets screening; OPEN |
| A09 | Technical manuals and buyer docs | docs/ | Repo operator | Seller proposed | NOT VERIFIED | documentation license/assignment | underlying third-party material | NDA_REQUIRED | PROPOSED | authorship and legal privilege segregation; OPEN |
| A10 | Product design, logos, brand creatives | public/ and controlled source design stores if any | Mixed / not fully verified | Seller proposed | NOT VERIFIED | owned editable source files and rights | stock/font/design licenses | NDA_REQUIRED | CONDITIONAL | creator proofs/source files; OPEN |
| A11 | Domain risckcomply.com and www | Vercel project domain evidence in docs/ma/FINAL_SALE_READINESS_CONTROL_TOWER.md | Operational project controller | Seller proposed | NOT VERIFIED (registrant) | registrar transfer and DNS plan at closing | registrar/registry; possible DNS provider | CONFIDENTIAL | CONDITIONAL | authoritative registrant/registrar record; OPEN |
| A12 | OSS packages and SBOM | package.json, package-lock.json, docs/security/P1_SBOM_ATTESTATION_CI.md | Repo operator | third-party licensors | third-party rights apply | license-compliant copies/notice files | license compliance, not blanket assignment | NDA_REQUIRED | LICENSED_ONLY | exact-head SBOM/license scan; LEGAL_REVIEW_REQUIRED |
| A13 | Provider projects/subscriptions | docs/ma-diligence/PROVIDER_TRANSFER_MATRIX.md | Provider-specific administrators | PROVIDER/CONTRACT SPECIFIC | NOT VERIFIED as seller-owned transferable accounts | move project or buyer-created replacement | PROVIDER-SPECIFIC | HIGHLY_CONFIDENTIAL | CONDITIONAL | buyer account, support/consent, billing; THIRD_PARTY_CONSENT_REQUIRED |
| A14 | Deployment/CI configuration | vercel config if present, .github/, env templates | Repo + project controller | Seller proposed | NOT VERIFIED | sanitized configuration and runbooks | GitHub/Vercel/Supabase | HIGHLY_CONFIDENTIAL | PROPOSED | scrub secrets, account ownership and parity; OPEN |
| A15 | Contractual rights, customer and pipeline items | docs/ma-diligence/COMMERCIAL_PIPELINE_EVIDENCE_REGISTER.md and executed agreements if found | Corporate mailbox/operator | NOT ESTABLISHED | NOT VERIFIED | only assignable rights with consent/privacy review | counterparty consent when needed | RESTRICTED | CONDITIONAL | executed underlying contracts/consents; OPEN |
| A16 | Runtime data, personal data and log archives | Supabase and provider accounts (not exported here) | Production provider/operator | NOT ESTABLISHED | NOT VERIFIED | only lawful scoped data migration | GDPR/privacy/legal-basis review | RESTRICTED | EXCLUDED_PENDING_REVIEW | inventory, retention, authority; LEGAL_REVIEW_REQUIRED |

No claim of exhaustive file-level coverage is made by this category inventory. A closing asset manifest must include path, blob hash or SHA-256, provenance, license and inclusion decision per file.

## 2. Intellectual Property Chain-of-Title Matrix — DRAFT

| Right / issue | What evidence establishes | What remains unproven | Required closure | State |
|---|---|---|---|---|
| Original creation | owner narrative; repository and history exist | legally attributable original authorship across all components | creator declaration supported by contribution history and documentary corroboration | LEGAL_REVIEW_REQUIRED |
| Creator-to-seller transfer | seller is named in transaction documents | executed written assignment/license from individual creator to selling company | counsel-approved definitive creator-to-seller rights instrument with correct assets, consideration/legal basis and signatures | SIGNATURE_REQUIRED |
| Other contributors | existing scorecard records 18,111 reachable commits reviewed and legacy identities; Git authors are not automatic rights owners | employment, contractor relationships, assigned rights, AI/automation attribution | counsel-directed contributor identity and contract/assignment reconciliation | OPEN |
| AI-assisted production | code/tooling may be AI assisted | provider terms at creation dates and any third-party copying | source provenance, tool terms and OSS screening; disclose appropriately | LEGAL_REVIEW_REQUIRED |
| Database, docs, designs | files and schema exist | rights and third-party inclusions | provenance plus assignment/license schedule | OPEN |
| Brand/trademark | public use of RISCK COMPLY | trademark filings/registrations, actual legal owner, conflicts | registry searches and ownership instruments | OPEN |
| Domain | Vercel application domain operational control | registrar title/registrant | authoritative registrar record and handoff eligibility | OPEN |
| Encumbrances | no verified clean encumbrance statement identified | liens, exclusive licenses, pledges, claims | seller declarations and counsel diligence | OPEN |

Repository admin access, Git commit identity and Vercel project-domain verification are control indicators ONLY, not proof of copyright title or domain registrant rights.

## 3. Proposed Acquisition Perimeter — DRAFT
Preferred hypothesis: asset purchase agreement (APA) covering seller-owned transferable software copyright, qualifying documentation, product-specific trade secrets and intellectual property, agreed owned design/source assets, assignable brands/domain and selected technical/operational deliverables. Purchase price, legal owner, tax structure, exclusions, territory, liabilities, governing law and buyer are all subject to negotiation/counsel review.

Alternative 1: narrower standalone software/IP purchase with buyer independently provisioning all provider accounts, infrastructure and DNS.
Alternative 2: product/technology asset purchase with carefully conditioned provider project transfers or migrations.
Alternative 3: either asset model plus separate, time-limited Transition Services Agreement (TSA), knowledge transfer and acceptance testing. None implies acquiring the entire SAMUEL CERQUEIRA, UNIPESSOAL LDA company or its unrelated café/metalwork business.

### Excluded Assets Schedule — DRAFT
Seller's unrelated business assets, unrelated contracts, bank accounts, unrelated liabilities, personal email accounts, privileged counsel documents, unlicensed third-party materials, secrets/passwords/API keys, unnecessary personal data, unrelated customer information and any asset not proven to be legally transferable. Live provider accounts are excluded by default unless negotiated, verified and legally/provider-authorized. Do not automatically share raw source code.

## 4. Third-Party Dependency and License Schedule — DRAFT
Source-of-truth: package-lock.json plus fresh SBOM/NOTICE at frozen delivery SHA; no blanket declaration of permissive-only or copyleft-free code.

| Category | Examples evidenced from package.json | Action | Status |
|---|---|---|---|
| Framework/UI | next, react, react-dom, next-intl, @radix-ui packages, framer-motion, lucide-react, recharts | reconcile exact versions + transitive licenses, notice/distribution duties | DRAFT_COMPLETE / LEGAL_REVIEW_REQUIRED |
| Auth/database | @supabase/supabase-js, @supabase/ssr | respect SDK terms; account/data migration independently | DRAFT_COMPLETE |
| Payment | stripe | keys, webhooks, legal billing identity and provider-specific handoff | THIRD_PARTY_CONSENT_REQUIRED |
| Observability | @sentry/nextjs | DSN and telemetry ownership/retention/migration | OPEN |
| AI/service integration | @zoerai/integration | exact use, terms, sublicense/transfer boundaries | OPEN |
| Testing/build | vitest, Playwright and npm tooling as configured | preserve OSS attribution and build reproducibility | OPEN |
| Potential LGPL | existing M&A matrix explicitly flags LGPL review | package, linkage and obligations must be analyzed per distribution model | LEGAL_REVIEW_REQUIRED |
| External assets | icons/images/fonts/content | check stock licenses and modification/redistribution rights | OPEN |

## 5. Digital Asset and Provider Register — DRAFT
Reference: docs/ma-diligence/PROVIDER_TRANSFER_MATRIX.md and docs/ma/FINAL_SALE_READINESS_CONTROL_TOWER.md. The following are service categories and historical documented controls, not current audited transfer approvals.

| Provider | Asset role | Proposed closing treatment | Open items |
|---|---|---|---|
| GitHub | source/repo/Actions | buyer repo transfer or sanitized export, preserve commit/CI evidence | buyer org, protections, billing, secrets, ownership |
| Vercel | app hosting/deployments/domains | provider-compliant project transfer or rebuild | buyer billing, deployment SHA, domain, release parity |
| Supabase | Postgres/Auth/Storage/functions | eligible project move or controlled buyer migration | backup/restore, membership, region, privacy, RLS |
| Stripe | LIVE billing | support-led business sale/change-of-control or buyer replacement | account legal identity, consent, customer data, keys |
| Google OAuth/Workspace | login/email/identity | IAM and mail/data transition where lawfully authorized | buyer domains, callbacks, billing, admin |
| Cloudflare/registrar | DNS/registrar/edge | coordinated domain/zone migration after approved closing | registrant proof, auth code, DNSSEC, TTL |
| Sentry | monitoring | role/project reassignment or buyer replacement | retention, billing, legal controller |
| Upstash | Redis/rate limiting | eligible team/database move or new buyer instance | DPA/billing, credentials, region |
| Resend | transactional email | verified domain claim/buyer new keys | provider rights, SPF/DKIM, deliverability |
| PostHog | analytics | export/migrate if legally permitted | controller, DPA, production-project link |

No provider account transfer, domain change, DNS update, key rotation or production mutation is authorized by this schedule.

## 6. Technical Asset Transfer Schedule — DRAFT
1. Identify buyer legal entity, scope, exclusions, jurisdiction and signing authorities.
2. Freeze approved source SHA, artifact inventory, SBOM, open issue register and evidence index; produce deterministic checksums.
3. Counsel validates chain of title, third-party licenses, personal-data schedule and seller authority.
4. Execute negotiated APA, IP assignment, schedules, disclosures, TSA and required corporate approvals.
5. Only after conditions precedent and expressly authorized closing: source delivery or repository transfer; reproducible build instructions; test/release pipeline; redacted architecture/API documentation; database schema+migrations; vendor runbooks; backups and data-retention plan.
6. Buyer-provisioned provider organization/accounts preferred where direct account transfer is unavailable or risky.
7. At agreed cutover: DNS/domain coordination, new buyer secrets and callback reconciliation, CI protections, limited smoke/UAT, rollback plan and incident contacts.
8. Evidence buyer acceptance, access revocation, credential rotations, data retention/deletion and TSA completion.

### Acceptance evidence fields
Asset ID; source commit SHA; manifest checksum; delivery destination; delivered-at UTC; sender/recipient sign-off; acceptance test/expected result; exceptions; buyer acknowledgment; unresolved dependency; counsel approval.

## 7. Draft IP/Asset Assignment and Closing Deliverables Checklist
- [ ] Verify creator identity and original/rightful ownership using documentary evidence.
- [ ] Determine whether and on what basis the creator has transferred/licensed rights to SAMUEL CERQUEIRA, UNIPESSOAL LDA.
- [ ] Obtain executed creator-to-seller assignment or legally appropriate alternative, without backdating or inventing any employment relationship.
- [ ] Reconcile each material third-party contributor/contractor and required rights grant.
- [ ] Verify seller incorporation/registry, directors/signatories, authorizations, CAE and tax/accounting implications.
- [ ] Schedule protected source assets, copyright, docs, design, trade secrets, domain and brand separately.
- [ ] Verify trademark rights and domain registrant before including as owned assets.
- [ ] Review OSS notices, copyleft obligations, asset-level commercial terms and tool terms.
- [ ] Document all material liens/encumbrances, disputes and exclusivity grants.
- [ ] Obtain counterparty/provider consents where legally required; otherwise choose compliant buyer migration.
- [ ] Finalize excluded assets, liabilities, warranties, indemnities, purchase terms, privacy/data schedule and conditions precedent.
- [ ] Obtain actual human approvals/signatures and agreed escrow/closing verification.
- [ ] Deliver technical handover with buyer acknowledgment and post-close control removal.

## 8. Known Liabilities and Open Legal/Transaction Requirements Register

| ID | Finding | Severity | Owner of next evidence | Required proof | State |
|---|---|---|---|---|---|
| L01 | Creator-to-seller IP chain missing signed evidence | CRITICAL | creator/seller/counsel | valid executed rights instrument | SIGNATURE_REQUIRED |
| L02 | Contributor relationship/assignment verification incomplete | HIGH | seller/counsel | attribution and contracts/confirmations | OPEN |
| L03 | Seller registry, signing authority and CAE record incomplete | HIGH | seller/counsel/accountant | registry/authorization and official records | OPEN |
| L04 | Trademark and design rights not conclusively evidenced | HIGH | seller/counsel | registry, provenance and assignment | OPEN |
| L05 | Domain registrant/title not independently proven | HIGH | registrar/seller | registrar proof | OPEN |
| L06 | Provider transfer rights/eligibility and buyer account not finalized | HIGH | provider/buyer | provider eligibility, consents or migration plans | THIRD_PARTY_CONSENT_REQUIRED |
| L07 | OSS/LGPL, proprietary SDK and third-party design provenance | HIGH | engineering/counsel | exact-SHA SBOM + counsel review | LEGAL_REVIEW_REQUIRED |
| L08 | Historical production vs main SHA mismatch and Vercel overdue balance noted in existing control tower | HIGH | seller/engineering/provider | fresh provider evidence and release parity | OPEN |
| L09 | Repo public visibility flagged by 2026-10-07 control tower | HIGH | seller/security | current visibility and disclosure exposure review | OPEN |
| L10 | Data/privacy/retention and confidential buyer disclosure perimeter | HIGH | privacy counsel | scoped data map, lawful processing and redaction plan | LEGAL_REVIEW_REQUIRED |
| L11 | Final buyer acceptance, executed APA, closing schedule and TSA | CRITICAL | buyer/seller/counsel | actual signed/executed closing evidence | SIGNATURE_REQUIRED |

## 9. Buyer-facing non-binding acquisition perimeter summary — DRAFT
RISCK COMPLY is presented as a pre-commercial AI governance and EU AI Act-oriented SaaS technology asset. The proposed transaction scope is the seller's legally owned and transferable application source code, proprietary product logic, related database schemas and migrations, qualifying technical documentation, product-specific designs and intellectual-property rights, and, where independently verified, identified brand/domain rights. Third-party services and licenses are subject to provider terms and may require migration into buyer-controlled accounts rather than assignment. Non-product business assets of the selling entity are excluded. The perimeter is illustrative and remains subject to title verification, executed agreements, third-party rights, privacy review and buyer due diligence. No certifications, revenue, customers, closed transaction, uncontested IP title or provider approvals are represented by this overview.

## 10. Evidence-based completion and next gates
- Category-level asset inventory: 16/16 defined categories documented = 100% STRUCTURAL_CATEGORY_COVERAGE; NOT a complete file-by-file provenance/title audit.
- Draft deliverable sections: 10/10 internal schedules/checklists/overviews assembled = 100% DRAFT_SECTION_COVERAGE; NOT legally executed or buyer approved.
- Verified legal ownership across 16 inventory rows: 0/16 independently established in this dossier = 0% ROW_LEVEL_LEGAL_TITLE_VERIFIED; this is a conservative documentation metric, not proof the seller lacks rights.
- Auditable global M&A diligence: 37.0/98 = 37.76% and 62.24% remaining according to the 2026-10-08 canonical matrix; not recalculated or improved merely by these drafts.
- Execution/closing readiness: NOT PASSED. No executed IP instrument, consents, signed APA, legal opinions or domain registrar proofs were manufactured.
- Source/code inventory completeness, audited signatures, provider approvals and latest exact-head synchronization require separate live evidence and cannot be claimed at 100%.
- Next authorized work: exact-SHA file-level manifest, historical contributors and license review, legal-document evidence collection, counsel sign-off, buyer terms and provider-specific handover assessment. No production/deployment/demo operations.
