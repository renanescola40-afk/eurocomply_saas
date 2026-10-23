# RISCK COMPLY — Legal V7 overlap reconciliation (V11 consolidated review, 21 October 2026)

**Status:** V11 consolidation implemented in review branch only; not an effective contract, legal approval, or enterprise acceptance.  
**Base reviewed:** `main` @ `70d3545f414d063379d481fd238aed563e05edda`.  
**Sources compared:** PR #2554 (`f77ccc1e037dfd37e6acefc0371418483b3e5e74`) and PR #2555 (`b2d98f482d67f853a9a2ba31cb70582422d9c1c2`).  
**V11 integration parent:** #2555 `2a5e6f04daa6fbb1ea2f0c5e25c098b3776a55b9`; #2554 source remains `f77ccc1e037dfd37e6acefc0371418483b3e5e74`.
**Scope:** documentation reconciliation only. No customer data, legal-signoff flag, main/release action or provider configuration changed.

## 1. Exact duplicate family discovered

| Function | PR #2554 | PR #2555 | Integration decision |
| --- | --- | --- | --- |
| DPA Art. 28 processing + TOMs + transfers | `docs/legal-review-preparation/legal-pack/ENTERPRISE_DPA_PROCESSING_AND_SECURITY_SCHEDULE_V7_2026-10-21.md` | `docs/legal-review-preparation/legal-pack/ENTERPRISE_DATA_PROCESSING_SECURITY_SCHEDULE_V7_REVIEW_DRAFT.md` | **Selected:** #2554 detailed processing/TOM parent consolidated into the existing #2555 schedule path, retaining #2555 independent-controller, sensitive-data, objection/remedy and buyer-completion qualifications. One proposed annex; no second #2554 schedule copied. |
| EU AI Act + GDPR role/timing matrix | `docs/legal-review-preparation/legal-pack/AI_ACT_GDPR_CUSTOMER_APPLICABILITY_MATRIX_V7_2026-10-21.md` | `docs/legal-review-preparation/legal-pack/EU_AI_ACT_GDPR_APPLICABILITY_MATRIX_V7_REVIEW_DRAFT.md` | **Selected:** existing #2555 matrix path, retaining its evidence legend/change triggers and adding #2554 scope, non-EU reach, role-change, FRIA/DPIA and lifecycle qualifications. Council timeline corroborated 2026-10-21; no customer-specific legal acceptance. |
| Integration/owner signoff | `docs/legal-review-preparation/OWNER_FINAL_LEGAL_FACTS_AND_ACCEPTANCE_V7_2026-10-21.md` | `docs/legal-assurance/LEGAL_PUBLICATION_PROCUREMENT_HANDOFF_V7_2026-10-21.md` | **Preserved both in this candidate:** owner factual completion from #2554 and publication gate/handoff from #2555. Updated owner annex link to the single selected schedule. |
| Index | both PRs edit `docs/legal-review-preparation/legal-pack/README.md` | both edit same file | **Resolved in candidate:** README lists exactly one proposed DPA schedule, one applicability matrix, and both complementary internal handoffs. Original branches remain historical sources. |

## 2. Preserved coverage and contract assembly controls

| Distinct source material | Consolidated location |
| --- | --- |
| #2554 Article 28 processing, TOM proof rows, provider/transfer table, lifecycle and order-form sheet | Selected #2555 schedule, sections A–I |
| #2555 independent supplier purposes, children's-data scope, objection/remedy and private-model-provider boundary | Selected schedule, sections A/B/D |
| #2555 role matrix, evidence legend, GDPR provisions and change-trigger register | Selected #2555 matrix, A–C |
| #2554 territorial/scope/role changes, FRIA vs DPIA distinction and customer lifecycle | Selected matrix, A and C1 |
| #2554 owner facts, IP and CAE evidence inventory | Owner facts document; no company fact completed |
| #2555 exact legal-publication gate and procurement handoff | Existing publication handoff; acceptance unchanged |
| Existing logical recovery #180 | DPA TOM row and matrix C1: scope explicitly limited to logical PostgreSQL; full-platform/rollback acceptance remains pending |

This is editorial consolidation of existing draft positions, not selection of new binding commercial terms. A legal reviewer still assesses the final combined version. Earlier statutory cross-check below is retained as historical work; this consolidation independently corroborated the broad amended milestones through the official Council timeline, not a complete fresh statutory review.


### Statutory-date cross-check performed 21 October 2026 (primary EU sources)

- Consolidated Regulation (EU) 2024/1689 as at 27 July 2026, Article 113: general applicability is 2 August 2026, with the express staggered exceptions in Article 113. The general applicability date is **not** a blanket high-risk operational deadline for every Annex.
- Regulation (EU) 2026/1744 (Digital Omnibus on AI), published in the Official Journal on 24 July 2026 and in force, amended Article 113: **2 December 2027** for Chapter III Sections 1–3 high-risk AI under Article 6(2)/Annex III, and **2 August 2028** for Article 6(1)/Annex I. Article 6(5) has an express exception from that amended paragraph.
- For specifically enumerated Article 5(1) additions and new paragraphs, the amendment specifies **2 December 2026**; this is not a blanket postponement of the Article 5 prohibitions already applicable since 2 February 2025.
- A narrow transitional provision concerns Article 50(2) obligations for certain providers of systems producing synthetic content placed on the market before 2 August 2026, with a 2 December 2026 adaptation date. Determine the actual provider/system/transitional facts before relying on it.
- Primary sources: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32026R1744 and https://eur-lex.europa.eu/eli/reg/2024/1689/2026-07-27/eng and https://digital-strategy.ec.europa.eu/en/news/ai-omnibus-enters-force.
- **Decision:** The dated Annex III / Annex I assertions in the overlapping V7 matrices are independently corroborated by current authoritative text. This resolves the *source/date lookup only*, not legal applicability for a particular customer's AI system, legal sign-off, contractual effect, or the duplicate-document publication decision. Recheck before buyer execution if the law changes.



1. The candidate now selects one proposed DPA annex and one customer matrix; section links and references are reconciled. Review the combined defined terms, provider/transfer facts and date references before integration. #2554 is superseded for integration by this candidate; retain its branch/history and do not merge both draft families.
2. Do **not** equate the European Commission's Article 28 model clauses (Decision 2021/915) with third-country transfer SCCs (Decision 2021/914); verify actual exporter/importer/processing roles and transfer flows before selecting modules.
3. A primary EU database region does not establish global EU-only processing or legal sufficiency of international transfers.
4. Verify seller's registered identity, active CAE, tax/VAT status, legal representative authority, intellectual-property chain of title and actual provider DPA/SCC/subprocessor terms privately before execution. Do not publish unverified identifiers.
5. Bind security claims to a tested release, not to draft source. No blanket uptime percentage, RTO/RPO, deletion SLA, clean external pentest, ISO 27001/SOC 2, or regulator approval without proof.
6. Exact-version buyer and signatory acceptance are separate from Git merge or document creation; never auto-set `LEGAL_LAUNCH_ACCEPTED`.

## 3. Reconciliation status and ownership boundary

- `DPA_FAMILY_OVERLAP=CONFIRMED`
- `MATRIX_FAMILY_OVERLAP=CONFIRMED`
- `CANONICAL_CONTRACT_SET=CONSOLIDATED_REVIEW_CANDIDATE_NOT_EFFECTIVE`
- `SELLER_AUTHORITY=UNVERIFIED`
- `CUSTOMER_ACCEPTANCE=NOT_OBTAINED`
- `LEGAL_PUBLICATION=NO_PASS`
- `ENGINEERING_MAIN_WRITER=PRIMARY_V11_EXECUTOR`
- `EMAILS_SENT=0`
- `PRODUCTION_WRITES=0`

**Next acceptance action:** review this exact combined version under required checks and qualified review, obtain company/IP/provider factual signoff and valid contract execution, then execute the official legal-publication control. No merge, signature, live publication, email or submission occurred.
