# RISCK COMPLY — IP Encumbrance Register

Date: 2026-10-06  
Status: `INTERNAL_REGISTER_READY / OWNER_CONFIRMATION_OPEN`

The repository alone cannot prove that assets are free of liens, pledges, prior assignments, exclusivity grants, conflicting licenses or disputes.

| Encumbrance class | Repository evidence | Current status | Evidence/action required |
|---|---|---|---|
| Prior IP assignment | None identified in reviewed repo | OPEN | Owner/legal-document confirmation |
| Exclusive license | None identified in reviewed repo | OPEN | Owner contract review/confirmation |
| Non-exclusive outbound license | OSS/public dependencies separately tracked | PARTIAL | Confirm no private outbound IP grants |
| Security interest / pledge / lien | Not evidenced by repo | OPEN | Owner/corporate/legal confirmation |
| Contractor retained rights | Contractor relationship not established | OPEN_IF_APPLICABLE | Contractor agreements/assignments |
| Employee retained rights | Employee relationship not established | OPEN_IF_APPLICABLE | Employment/IP agreements |
| Trademark conflict/dispute | No title opinion from repo | OPEN | Official search/owner disclosure as transaction requires |
| Domain dispute/lock | Operational use only | PARTIAL | Registrar status/export |
| Source-code escrow | None identified | OPEN | Owner confirmation |
| Litigation/claim affecting IP | Not provable from repo | OPEN | Owner/legal disclosure |
| OSS obligations | Inventory and review exist | PARTIAL_CLOSED_CONTROL | Refresh SBOM/license review at transaction SHA |
| Provider non-transferability | Provider matrix exists | PARTIAL | Execute buyer-specific transfer/change-of-control path |

## Owner factual confirmation requested

The owner should confirm, truthfully and in a signed/datable form if requested by the transaction process, whether any material RISCK COMPLY asset is subject to a lien, pledge, security interest, prior sale/assignment, exclusive license, source-code escrow, dispute, injunction, settlement restriction or unresolved third-party ownership claim.

```text
ENCUMBRANCE_REGISTER=PASS_DOCUMENTED
ENCUMBRANCE_FREE_REPRESENTATION=NOT_YET_SUPPORTED
OWNER_CONFIRMATION_REQUIRED=YES
```
