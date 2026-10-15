# Known Risks and Remediation Register
Date: 2026-10-14 | Owner: Seller diligence controller | All items OPEN unless independent closing evidence arrives.

| ID | Priority | Gap | Evidence/request | Responsible party |
|---|---|---|---|---|
| G01 | Critical | Executed creator-to-seller IP chain not demonstrated | signed instrument and chain/title review | Owner + counsel |
| G02 | Critical | Official registry, articles, RCBE, signatory authority not fully credited | up-to-date official certified records | Owner |
| G03 | Critical | Tax status, VAT/VIES and clearance not credited | official AT records + tax counsel/accountant | Accountant |
| G04 | Critical | Financial statements, bank/cash/debt, full revenue position incomplete | complete official ledger + statements | Accountant |
| G05 | High | Provider account ownership/transfer close-out incomplete | dated account and contract proofs | Provider account owner |
| G06 | High | Independent clean security retest/tenant isolation unproven | authorized attributable final reports | Security assessor |
| G07 | High | Source SHA versus production and release gates not freshly validated in this pass | deploy SHA and CI logs | Technical diligence |
| G08 | High | Domain/brand/trademark legal title unproven | registrar, trademark and source-asset provenance | Owner + counsel |
| G09 | Medium | Current GDPR/DPA executed legal posture needs evidence | signed and counsel-reviewed documents | Counsel/provider |
| G10 | Medium | Buyer-specific diligence, approvals and transaction structure not agreed | actual buyer request + approvals | Seller + buyer |

Do not treat any gap as closed because a remediation plan, checklist or template exists.


## Additional observed conflicts — V2, 2026-10-15
| ID | Priority | Risk and evidence | Required resolution | Status |
|---|---|---|---|---|
| G11 | Critical | `docs/assurance/iso27001-soc2/exact-sha-production-drift-2026-10-15.md` documents a *dated* 108-commit main/deploy divergence and deployed SHA `857ddfb21d0135df3a026ad480da5945119b175c`. Snapshot is not present-time proof. | New read-only Vercel/GitHub comparison, exact-SHA CI and buyer-facing qualification; deploying requires separate authorization | OPEN |
| G12 | High | Security PR #2477 was OPEN when reviewed, proposing privileged-key rejection for a local tenant-isolation proof. Proposed/tested code is not assumed merged or deployed. | Re-evaluate PR state and supported results before any security completion claim | OPEN |
| G13 | High | Full document-link/reference coverage and confidential-material scan absent; 6/6 existing relative Markdown links are not exhaustive. | Clean isolated checkout full source/attachment link, secret, PII and privilege screening; redacted output under owner review | OPEN |

G01–G10 remain OPEN unless separate authenticated closure evidence is recorded. All gaps are documentary observations, not exploitation findings.
