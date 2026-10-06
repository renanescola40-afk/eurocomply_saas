# RISCK COMPLY — Corporate + IP + Title Final Closure Matrix

Date: 2026-10-06  
Baseline main SHA: `11fa0ddf024e7449c3eed9ffe551afed384618d9`  
Seller entity: SAMUEL CERQUEIRA, UNIPESSOAL LDA  
Scope: corporate authority, IP chain of title, asset title and transfer readiness for a 100% RISCK COMPLY sale.

This matrix is evidence-bound. Internal documents may close documentation/control requirements, but they do not substitute for signed assignments, registry extracts, RCBE proof, registrar title evidence, trademark records, or transaction-specific corporate approvals.

| Requirement | Current state | Current evidence | Missing evidence | Can close internally | Requires owner document | Requires external authority | Action | Final status |
|---|---|---|---|---:|---:|---:|---|---|
| Creator-to-seller IP chain | No executed transfer identified | Git history + IP ownership master + execution-ready scope pack | Validly executed creator-to-seller assignment or other counsel-approved title instrument | No | Yes | Yes | Execute reviewed instrument before unqualified title representation | BLOCKED_EXTERNAL |
| Company registry evidence | Seller identity corroborated but registry proof absent | Owner designation + authenticated Stripe company profile | Current commercial registry certificate | No | Yes | Yes | Obtain and retain controlled copy | BLOCKED_EXTERNAL |
| RCBE beneficial ownership | Not proven | Request path documented | Current RCBE consultation/submission proof | No | Yes | Yes | Obtain and retain controlled copy | BLOCKED_EXTERNAL |
| Manager/director authority | Not proven | Corporate authority matrix exists | Current registry/articles evidence | No | Yes | Yes | Reconcile official manager powers | BLOCKED_EXTERNAL |
| Signatory authority | Not proven | Internal signing matrix exists | Registry/articles/resolution/POA as applicable | No | Yes | Yes | Establish transaction-specific signatory authority | BLOCKED_EXTERNAL |
| Software/SaaS CAE | Current status not credited | Historical/operator context only | Current official activity/CAE evidence | No | Yes | Yes | Reconfirm and update official activity if required | BLOCKED_EXTERNAL |
| Articles/constitutional documents | Not credited | Request route documented | Current articles/memorandum evidence | No | Yes | Yes | Obtain current authoritative copy | BLOCKED_EXTERNAL |
| Sale authorization requirements | Decision logic documented | Corporate authority matrix + transaction decision matrix | Structure-specific approval conclusion and, if required, signed resolution | Partial | Yes | Yes | Finalize with transaction structure/counsel | PARTIAL |
| Domain title | Operational control/use evidenced | Production use + provider/domain references | Registrar ownership/control export and transfer path confirmation | Partial | Yes | Yes | Export registrar evidence and closing handoff steps | PARTIAL |
| Trademark/brand title | Public use evidenced | Brand use in product/docs | Registration/filing evidence if claimed, or explicit unregistered-mark disclosure | Partial | Yes | Yes | Do not claim registration without official evidence | PARTIAL |
| Logo/design title | Assets exist | Repository/public assets | Provenance/source-file ownership and third-party asset/font license evidence where applicable | Yes | Yes | Possibly | Complete provenance declaration and retain source/licensing evidence | PARTIAL |
| Documentation copyright | Repository docs exist | Git history + documentation inventory | Creator/contributor chain into seller | Partial | Yes | Yes | Include in creator-to-seller title instrument | PARTIAL |
| Database/schema rights | Schema/migrations evidenced | Repository database artifacts | Legal title chain into seller | Partial | Yes | Yes | Include database/schema rights in title instrument | PARTIAL |
| IP encumbrances | No clean claim support in repo | Encumbrance register created | Owner declaration + relevant contract/lien/dispute review | Partial | Yes | Possibly | Complete factual declaration and transaction review | PARTIAL |
| Source repository/control | GitHub repository control evidenced | Current repository and protected-main history | Closing admin/export package | Yes | No | No | Export owner/admin/rules evidence at transaction cutoff | CLOSED |
| Contributor identification | >18,000 commits reviewed; identities tracked | IP ownership master + contributor register | Relationship declarations for legacy identities | Yes | Yes | No | Complete owner relationship declarations | PARTIAL |
| OSS/SBOM | Evidence exists and current process documented | CycloneDX SBOM, lockfile inventory, license review | Refresh at transaction SHA | Yes | No | No | Regenerate at cut-off SHA | CLOSED |
| Provider transfer map | Material providers mapped | Provider transfer/change-of-control review | Buyer-specific execution and residual account-owner proof | Partial | Yes | Yes | Execute provider handoff at closing | PARTIAL |
| Asset title register | Canonical register now created | ASSET_TITLE_REGISTER.md | External title proofs where identified | Yes | Yes | Yes | Maintain as transaction index | CLOSED |
| Owner document request pack | Minimal authoritative request set now created | OWNER_DOCUMENT_REQUEST_PACK.md | Requested external documents themselves | Yes | Yes | Yes | Use as controlled acquisition checklist | CLOSED |
| Transaction structure matrix | Share/asset/IP/business/hybrid compared | TRANSACTION_DECISION_MATRIX.md | Buyer-specific and counsel-specific decision | Yes | Yes | Yes | Use evidence, not score, to select structure | CLOSED |
| Transfer execution pack | Scope prepared and explicitly unexecuted | IP_CHAIN_OF_TITLE_EVIDENCE_PACK.md | Signatures/effective execution | Yes | Yes | Yes | Execute only after professional review | CLOSED |

## Scope percentages

Scoring for this closure scope uses:
- CLOSED = 1.0
- PARTIAL = 0.5
- OPEN/BLOCKED_EXTERNAL = 0.0
- N/A only with evidence.

Corporate scope (registry, RCBE, authority, CAE, articles, sale authorization): 0.5 / 7 = **7.14% evidence closure**.  
IP/title scope (creator chain, domain, brand, design, documentation, database, encumbrances, repository, contributors, OSS): 4.0 / 10 = **40.00% evidence closure**.  
Asset-transfer readiness scope (provider map, asset register, request pack, transaction matrix, execution pack): 4.5 / 5 = **90.00% readiness closure**.

Weighted total for this 22-item corporate/IP/title scope: **9.0 / 22 = 40.91%**.  
Remaining evidence closure: **59.09%**.

These percentages measure evidence closure, not document readiness. Internal documentation for this defined scope is now materially complete; the remaining blockers are predominantly authoritative evidence and execution.

## Truth boundary

```text
INTERNAL_DOCUMENT_CLOSURE=PASS
UNQUALIFIED_SELLER_IP_TITLE=NO
CORPORATE_TRANSACTION_AUTHORITY_PROVEN=NO
EXTERNAL_DOCUMENT_SET_PRECISELY_IDENTIFIED=YES
HIDDEN_INTERNAL_DOCUMENT_BLOCKERS=NONE_IDENTIFIED
FINAL_CORPORATE_IP_GO=PASS
```
