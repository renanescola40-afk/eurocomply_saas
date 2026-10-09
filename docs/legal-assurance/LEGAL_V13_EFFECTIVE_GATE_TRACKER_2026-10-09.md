# V13 evidence gate tracker — 2026-10-09

Scope: legal, corporate and procurement lane. Internal preparation is distinct from legally effective completion. Main baseline: `95c59aa12c221bdfc067b646551307ba6f63a3bf`. PR: #2389.

## Existing internally prepared domains (10/10 documentation coverage, **not** legal launch completion)
1. Commercial Terms and MSA/order wording: EXISTING REVIEW MATERIAL.
2. Privacy Notice and Article 13/14 mapping: EXISTING REVIEW MATERIAL.
3. Data Processing Addendum and Article 28 matrix: EXISTING REVIEW MATERIAL.
4. Subprocessor and cross-border transfer registers: EXISTING PARTIAL-FACT MATERIAL.
5. Retention/deletion and data subject controls: EXISTING PARTIAL-FACT MATERIAL.
6. Security architecture / access control / tenant isolation: EXISTING EVIDENCE-BOUND MATERIAL.
7. Support, incident policy and service terms: EXISTING REVIEW MATERIAL.
8. Business continuity and recovery disclosures: EXISTING EVIDENCE-BOUND MATERIAL.
9. Enterprise procurement packet and security questionnaire: EXISTING INTERNAL PACK.
10. Corporate identity, IP and authority checklists: EXISTING PARTIAL-FACT MATERIAL.

**Documentation coverage: 10/10 present (100% file-family coverage only).** Not all documents are current, approved, effective, signed, or validated against today's deployed SHA. No completion percent for effective legal readiness can be inferred from this coverage.

## Material unresolved effective-contract gates
- [ ] Official attributable legal entity extract, current registration, registered office, NIPC and signatory authority.
- [ ] Actual CAE/corporate purpose and Portuguese VAT/tax/invoicing treatment established.
- [ ] Intellectual-property chain of title and domain/brand rights evidenced with legally sufficient acts.
- [ ] Commercial Terms/Privacy final approval, accurate identifiers, version/effective dates and deployed checkout incorporation.
- [ ] Customer processor DPA signature/acceptance and final service/processing schedules before applicable processing.
- [ ] Provider account-specific processing, transfer, subprocessor and retention evidence aligned.
- [ ] Current source/deployment parity, public routes and fail-closed checkout validated on accepted release.
- [ ] Buyer-specific contractual conditions and assurance, if and when imposed by a buyer.

## GitHub PR verification snapshot
PR #2389 at commit `8f4097f0d9f65c8c7454711d010459e4cacee02a`: `mergeable=true` but `mergeable_state=blocked`. 40 check runs returned; among them Core CI, CodeQL, OWASP ZAP, quality/security/build and E2E production-like were reported `in_progress` in the inspected snapshot. Overall status was not PASS. Do not merge until required checks/reviews satisfy branch protection. Do not conflate a Vercel commit status failure with failing legal text.

## Required owner/legal decisions
The 2026-09-12 owner-approved legal decision sheet (`APROVO O PACOTE LEGAL V1`) controls draft commercial positions, but is not approval of effective contracts. The company officer must approve final exact versions only after registry, fiscal and provider evidence reconciliation. A lawyer review is required when applicable or customer-imposed, not automatically for every internal evidence artifact.

## Release posture
`INTERNAL_DOCUMENTATION_COVERAGE=10/10 PRESENT`
`EFFECTIVE_LEGAL_LAUNCH=BLOCKED`
`PROCUREMENT_INTERNAL_PACKET=PREPARED_WITH_EXCEPTIONS`
`BUYER_ACCEPTANCE=UNVERIFIED`
`PERCENT_EFFECTIVE_LEGAL_READY=NOT_CALCULABLE_FROM_FILE_PRESENCE`
`PUBLIC_PAID_SELF_SERVE=NO_GO_UNTIL_REVERIFIED`

This tracker is a private/internal engineering-documentation file, not a public offer, legal opinion, contractual acceptance, seller signature, or third-party submission.
