# RISCK COMPLY — GDPR Article 28 DPA Control Matrix

Date: 2026-09-09  
Primary official baseline: GDPR Article 28 and Commission Implementing Decision (EU) 2021/915 controller-processor SCCs.  
Important: Decision 2021/915 clauses do **not** by themselves satisfy Chapter V international-transfer requirements.

## Matrix

| Control | Art. 28 area | Current DPA draft | State | Remaining closure |
|---|---|---|---|---|
| Subject matter | 28(3) | Annex 1 identifies operation of contracted RISCK COMPLY service | PASS_DOCUMENTED | Customer/order-form specifics may refine |
| Duration | 28(3) | Subscription plus documented return/deletion period | BLOCKED | Export/deletion period not final |
| Nature of processing | 28(3) | Collection, storage, organisation, retrieval, use, authorised disclosure, export/deletion support | PASS_DOCUMENTED | Validate against actual enabled providers/features |
| Purpose | 28(3) | Provide, secure, support and maintain customer compliance workflows | PASS_DOCUMENTED | Keep scope synchronized |
| Personal-data categories | 28(3) | Placeholder/customer-specific | BLOCKED | Define baseline categories and allow order-form/customer-specific extension |
| Data-subject categories | 28(3) | Candidate users/employees/contractors/vendor contacts | BLOCKED | Final baseline/customer-specific confirmation required |
| Documented instructions | 28(3)(a) | DPA §3 documented-instruction language exists | PASS_DOCUMENTED | Contract incorporation/signature pending |
| Transfer instructions / law requirement notice | 28(3)(a) | §3 and §7 acknowledge instructions and lawful transfer mechanisms | BLOCKED | Provider-by-provider transfer register/mechanisms open |
| Confidentiality | 28(3)(b) | §4 | PASS_DOCUMENTED | Operational HR/access evidence not yet bound into legal pack |
| Security / Article 32 | 28(3)(c) | §5 and security-control map | PASS_DOCUMENTED_PENDING_EVIDENCE_RECONCILIATION | Complete TOMs matrix against exact Production evidence |
| Subprocessor conditions | 28(2), 28(4) | §6 exists | BLOCKED | General vs specific authorisation, notice period, objection/remedies, provider role allocation not final |
| Data-subject assistance | 28(3)(e) | §8; product export/delete controls | PASS_DOCUMENTED_PENDING_OPERATIONAL_VALIDATION | End-to-end DSAR routing/deadline/exception validation |
| Articles 32–36 assistance | 28(3)(f) | §§5, 9, 10 | PASS_DOCUMENTED | Final contractual boundaries and customer-specific support terms remain |
| Deletion / return | 28(3)(g) | §11 | BLOCKED | Export window, retention/legal-hold boundaries and backup-cycle facts not final |
| Demonstrate compliance / audit | 28(3)(h) | §12 | PENDING_EXTERNAL_REVIEW | Audit frequency, confidentiality, cost and on-site limits need commercial/legal decision |
| Notify unlawful instruction | 28(3) final sentence | §3 | PASS_DOCUMENTED | None beyond final review |
| Controller/processor party identity | contract formation | Draft names proposed entity | BLOCKED | Registered office and NIF/NIPC authoritative confirmation required |
| Annex TOMs | 2021/915 structure | §5 + Annex 2 points to evidence | BLOCKED | Contract-grade TOM schedule not yet frozen |
| Annex subprocessors | 2021/915 structure | Annex 3 requires completed production register | BLOCKED | Active providers/legal roles/transfers incomplete |
| Liability/precedence | commercial/legal | §§2, 13 | PENDING_EXTERNAL_REVIEW | Liability cap/carve-outs require legal/commercial judgment |

## Current gate

```text
DPA_CORE_ARTICLE_28_STRUCTURE=PASS_DOCUMENTED
DPA_PARTY_IDENTITY=BLOCKED
DPA_SUBPROCESSOR_MECHANISM=BLOCKED
DPA_TRANSFER_MECHANISM=BLOCKED
DPA_DELETION_RETURN=BLOCKED
DPA_TOMS_ANNEX=BLOCKED
DPA_ARTICLE_28=BLOCKED
```

The DPA is substantially structured around Article 28, but it is not final or signable until the factual and contractual blockers above are closed.