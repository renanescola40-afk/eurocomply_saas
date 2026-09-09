# RISCK COMPLY — GDPR Official Source Register

Verified: 2026-09-09  
Jurisdiction baseline: Portugal / European Union  
Purpose: source-first grounding for the Legal + GDPR Regulatory Closure V2 lane.

This register distinguishes binding law, Commission decisions, EDPB guidance and Portuguese supervisory-authority guidance. Guidance is not promoted to binding law.

| ID | Authority / type | Source | Legal/control use | Verified state |
|---|---|---|---|---|
| GDPR-2016-679 | EUR-Lex / binding EU law | Regulation (EU) 2016/679, CELEX 32016R0679 — https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32016R0679 | Articles 12–22 transparency/rights; Art. 28 processor contracts; Art. 30 RoPA; Arts. 32–36 security/breach/DPIA; Art. 37 DPO; Chapter V transfers | VERIFIED_2026-09-09 |
| SCC-ART28-2021-915 | European Commission / implementing decision | Commission Implementing Decision (EU) 2021/915 — https://eur-lex.europa.eu/eli/dec_impl/2021/915/oj | Official controller-processor standard clauses under Art. 28(7); baseline for DPA control matrix | VERIFIED_2026-09-09 |
| EDPB-TRANSFER-SUPPLEMENTARY-01-2020 | EDPB / recommendation | Recommendations 01/2020, final 18 June 2021 — https://www.edpb.europa.eu/our-work-tools/our-documents/recommendations/recommendations-012020-measures-supplement-transfer_en | Assessment of supplementary measures where transfer tools require them | VERIFIED_2026-09-09 |
| EDPB-ENDORSED-WP29 | EDPB / endorsed guidance index | https://www.edpb.europa.eu/endorsed-wp29-guidelines_en | Includes transparency WP260, portability WP242, DPIA WP248 rev.01 and other endorsed GDPR guidance | VERIFIED_2026-09-09 |
| CNPD-DPO | CNPD / Portuguese supervisory guidance | https://www.cnpd.pt/organizacoes/outras-obrigacoes/encarregado-de-protecao-de-dados/ | Portuguese operational explanation of when DPO appointment is mandatory and organisation responsibility to assess the trigger | VERIFIED_2026-09-09 |
| CNPD-DPIA | CNPD / Portuguese supervisory guidance | https://www.cnpd.pt/organizacoes/outras-obrigacoes/avaliacao-de-impacto/ | Article 35 DPIA trigger guidance, CNPD Regulation 798/2018 reference and Art. 36 prior-consultation boundary | VERIFIED_2026-09-09 |
| CNPD-DPIA-LIST | CNPD / binding/national supervisory list reference | CNPD Regulation 798/2018, linked from https://www.cnpd.pt/decisoes/regulamentos/ | Portuguese list of processing operations subject to DPIA under Art. 35(4) | VERIFIED_REFERENCE_2026-09-09 |
| CNPD-OTHER-OBLIGATIONS | CNPD / Portuguese supervisory operational guidance | https://www.cnpd.pt/organizacoes/outras-obrigacoes/ | CNPD points to controller/processor RoPA models, breach notification, DPO and DPIA obligations | VERIFIED_2026-09-09 |

## Critical distinctions

### Article 28 clauses are not Chapter V transfer clauses

Commission Implementing Decision (EU) 2021/915 is an official Article 28 controller-processor contractual baseline. Its clauses expressly do not by themselves ensure compliance with GDPR Chapter V international-transfer obligations. Transfer mechanisms must therefore remain independently mapped in `INTERNATIONAL_TRANSFER_REGISTER.md`.

### DPIA trigger is fact-dependent

CNPD states that DPIA is required where Article 35 conditions apply, including relevant large-scale sensitive/criminal data processing, large-scale systematic monitoring of publicly accessible areas and significant automated profiling/decisioning, and in situations listed in CNPD Regulation 798/2018. If residual high risk remains despite mitigations, prior consultation under Article 36 is a separate gate.

### DPO is not automatic for every company

CNPD states that companies are not universally required to appoint a DPO; the statutory trigger depends on the organisation's actual processing, including large-scale sensitive/criminal data or large-scale regular and systematic monitoring. RISCK COMPLY therefore keeps `DPO_REQUIRED=UNCERTAIN` until scale and processing facts are evidenced rather than inventing a DPO or automatically declaring one required.

## Refresh rule

Re-verify this register when:

- GDPR or Portuguese implementation law changes;
- a relevant Commission/EDPB/CNPD source is superseded;
- provider/data-flow facts change materially;
- a customer use case changes DPIA/DPO/transfer applicability;
- a qualified reviewer identifies a source/version gap.

Secondary commentary may be used only for discovery and must not replace these primary/official sources for closure decisions.