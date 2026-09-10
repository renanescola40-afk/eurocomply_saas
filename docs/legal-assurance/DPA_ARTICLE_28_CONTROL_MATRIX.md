# RISCK COMPLY — GDPR Article 28 DPA Control Matrix

Date: 2026-09-10  
Primary official baseline: GDPR Article 28 and Commission Implementing Decision (EU) 2021/915 controller-processor SCCs.  
Important: Decision 2021/915 clauses address Article 28 contracting and do **not** by themselves satisfy GDPR Chapter V international-transfer requirements.

## Matrix

| Control | Art. 28 area | Current DPA evidence | State | Remaining closure |
|---|---|---|---|---|
| Public DPA disclosure surface | procurement / contract review | `/[locale]/dpa` now renders a versioned `PublicLegalReviewPage` with Article 28 structure and `REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED` fail-closed status | PASS_REVIEW_DRAFT_STRUCTURE | Final/signable publication still requires party facts, annexes and qualified legal acceptance |
| Subject matter | 28(3) | DPA Annex 1 identifies operation, security, support and maintenance of the contracted RISCK COMPLY service | PASS_DOCUMENTED | Customer/order-form specifics may refine |
| Duration | 28(3) | Subscription plus applicable return/deletion lifecycle | PARTIAL_PASS_STRUCTURE | Final post-termination export/deletion window requires contract decision and verified provider capabilities |
| Nature of processing | 28(3) | Collection, storage, organisation, retrieval, use, authorised disclosure, export and deletion-support operations | PASS_DOCUMENTED | Keep synchronized with enabled providers/features |
| Purpose | 28(3) | Provide, secure, support and maintain customer compliance workflows and requested service functionality | PASS_DOCUMENTED | Keep scope synchronized |
| Personal-data categories | 28(3) | Annex 1 now defines a conservative baseline for account/workspace identifiers, organisation/membership, customer-entered workflow records, support material and operational metadata where personal | PASS_DOCUMENTED_BASELINE | Customer/order form may narrow or extend within permitted service scope |
| Data-subject categories | 28(3) | Annex 1 now defines authorised users, customer employees/contractors, vendor/business contacts and other persons represented in customer-provided records | PASS_DOCUMENTED_BASELINE | Customer/order form may narrow or extend within permitted service scope |
| Special-category/criminal-offence boundary | 28(3) context / Art. 9/10 | Draft states these are not an ordinary default use case and require expressly approved scope and additional safeguards before intentional processing | PASS_FAIL_CLOSED_BOUNDARY | Concrete lawful condition and safeguards required for any intentionally approved case |
| Documented instructions | 28(3)(a) | DPA §3 requires documented customer instructions and preserves required-law exception/notice boundary | PASS_DOCUMENTED | Binding effect depends on final incorporation/signature |
| Notify unlawful instruction | 28(3) final sentence | DPA §3 requires an instruction-law concern to be raised rather than silently accepted | PASS_DOCUMENTED | None beyond final legal wording review |
| Confidentiality | 28(3)(b) | DPA §4 plus role/access-control evidence | PASS_DOCUMENTED | Contract-grade operational evidence should remain current |
| Security / Article 32 | 28(3)(c) | DPA §5 and `TOMS_MATRIX.md` map authentication, tenant scope, RBAC/RLS, step-up, audit/logging and secure-SDLC controls while limiting unsupported claims | STRONG_PARTIAL_PASS_EVIDENCE_BOUND | Provider-at-rest evidence, remaining retention/provider facts and final TOM schedule remain open |
| Subprocessor authorisation | 28(2) | DPA §6 requires prior written authorisation and an up-to-date register | PASS_STRUCTURE_DECISION_PENDING | General vs specific authorisation, notice period, objection/remedies and final active provider set remain open |
| Subprocessor flow-down / responsibility | 28(4) | DPA §6 requires applicable data-protection obligations to flow down and preserves processor responsibility as required by law | PASS_DOCUMENTED | Final provider contracts/account evidence required |
| Transfer instructions / law requirement notice | 28(3)(a) + Chapter V boundary | §§3 and 7 preserve instruction requirement and separate Article 28 clauses from Chapter V transfer mechanisms | PASS_STRUCTURE_TRANSFER_FACTS_OPEN | Provider-by-provider location/mechanism/TIA/adequacy/SCC evidence remains open |
| Data-subject assistance | 28(3)(e) | §8 now references the canonical tenant-scoped rights lifecycle; issue #2009 is closed and protected exact-SHA Data Governance V2 evidence passed | PASS_DOCUMENTED_EXACT_SHA_RUNTIME_GATE | Case-specific legal exceptions and downstream completion remain separate |
| Articles 32–36 assistance | 28(3)(f) | §§5, 9 and 10 cover security, DPIA/prior consultation and breach information assistance | PASS_DOCUMENTED | Final contractual service boundaries and any stricter notification target remain open |
| Personal-data breach notification | 28(3)(f) / Art. 33(2) | §10 requires customer notification without undue delay after awareness plus reasonably available response information | PASS_DOCUMENTED | Any tighter SLA/cadence must match proven operational capability and final agreement |
| Deletion / return | 28(3)(g) | §11 requires return/deletion subject to documented legal retention and verified provider lifecycle constraints | PASS_STRUCTURE_FACTS_OPEN | Final export/deletion window, backup cycles and complete downstream deletion facts remain open |
| Demonstrate compliance / audit | 28(3)(h) | §12 preserves required information and audit/inspection rights and prevents practical safeguards from deleting mandatory rights | PASS_STRUCTURE_EXTERNAL_REVIEW | Frequency, notice, confidentiality, cost and on-site mechanics require final commercial/legal decision |
| Controller/processor party identity | contract formation | Draft deliberately does not infer an unresolved operator/contracting entity | BLOCKED_FOUNDER_ENTITY_FACT | Final legal entity, registered address and identifiers require authoritative evidence |
| Annex TOMs | Article 28 / 2021/915 structure | Annex 2 is evidence-bound to `TOMS_MATRIX.md`, security-control map and current runtime artifacts rather than unsupported promises | STRONG_PARTIAL_PASS | Freeze contract-grade current Production/provider facts and remaining retention statements |
| Annex subprocessors | Article 28 / 2021/915 structure | Annex 3 defines required final fields and public review boundary | BLOCKED_PROVIDER_FACTS | Active legal entities, purposes, locations, transfer position and authorisation state incomplete |
| Liability/precedence | commercial/legal | §§2 and 12–15 preserve DPA precedence concept and mandatory rights without inventing a final cap | PENDING_EXTERNAL_REVIEW | Liability cap/carve-outs and final contract mechanics require legal/commercial judgment |

## Current gate

```text
DPA_PUBLIC_REVIEW_SURFACE=PASS_IMPLEMENTED
DPA_CORE_ARTICLE_28_STRUCTURE=PASS_DOCUMENTED
DPA_BASELINE_PROCESSING_ANNEX=PASS_DOCUMENTED
DPA_DATA_SUBJECT_ASSISTANCE_RUNTIME=PASS_EXACT_SHA
DPA_PARTY_IDENTITY=BLOCKED_FOUNDER_ENTITY_FACT
DPA_SUBPROCESSOR_MECHANISM=PASS_STRUCTURE_DECISION_PENDING
DPA_TRANSFER_STRUCTURE=PASS_TRANSFER_FACTS_OPEN
DPA_DELETION_RETURN=PASS_STRUCTURE_FACTS_OPEN
DPA_TOMS_ANNEX=STRONG_PARTIAL_PASS
DPA_FINAL_CONTRACT=BLOCKED_FINAL_FACTS_AND_QUALIFIED_REVIEW
DPA_ARTICLE_28_FINAL=BLOCKED
```

The repository-controlled Article 28 structure is now materially closed as a review-draft implementation. The remaining blockers are not a missing DPA page or missing core clause map: they are final party identity, provider/subprocessor and transfer facts, contract-grade TOM/retention details, commercial terms and qualified legal acceptance. Internal CI or documentation must not promote those external/factual gates to final acceptance.
