# RISCK COMPLY — Commercial Pipeline Evidence Register

Date: 2026-10-05  
Source: connected corporate Gmail mailbox  
Purpose: M&A diligence commercial-fact evidence  
Status: `PIPELINE_EVIDENCE=VERIFIED_LIMITED`

This register distinguishes sent outreach, delivery failures, human routing/interest signals and actual commercial commitments. It must not be read as proof of revenue, customers, LOIs, signed pilots or acquisition offers.

## Outreach metrics

Gmail message-ID searches were counted with pagination and deduplicated.

| Metric | Count | Query scope / boundary |
|---|---:|---|
| Strategic acquisition-filtered sent messages | 223 | Sent after 2026-09-01 matching strategic acquisition wording |
| Pilot/procurement-filtered sent messages | 260 | Sent after 2026-09-01 matching RISCK COMPLY + pilot/procurement wording |
| Overlap between the two sent sets | 131 | Same Gmail message IDs present in both searches |
| **Unique sent messages across both sets** | **352** | Deduplicated union |
| Delivery-failure messages found | 22 | Inbox after 2026-09-01 matching undeliverable/failure patterns |

These are mailbox-message counts, not unique-company counts and not successful-delivery counts.

## Verified current signals

| Counterparty | Date | Verified response | Classification | What is NOT claimed |
|---|---|---|---|---|
| B3 | 2026-10-05 | Investor Relations confirmed the material was shared with the responsible team and said they would contact RISCK COMPLY if interested | `ROUTED_TO_RESPONSIBLE_TEAM` | No acquisition interest, offer, LOI, valuation acceptance or diligence request is claimed |
| ServiceNow | 2026-09-22 | Investor Relations confirmed the proposal was forwarded to Corporate Development | `ROUTED_TO_CORPORATE_DEVELOPMENT` | No acquisition interest, offer, LOI or diligence request is claimed |
| Banco BPI | 2026-09-29 | Bank confirmed the AI Governance / EU AI Act pilot proposal was under analysis and that it would respond later | `PILOT_PROPOSAL_UNDER_ANALYSIS` | No active pilot, customer relationship, contract or revenue is claimed |
| Devo / Strike48 | 2026-10-05 | Human response said acquisition discussion would belong to another department and timing was poor because of a new platform release, suggesting roughly three months | `TIMING_SIGNAL_NOT_CURRENT_INTEREST` | No current acquisition interest is claimed |
| E.ON | 2026-10-02 | Human response stated sufficient external support exists for current/scheduled projects | `DECLINED_CURRENT_NEED` | No active opportunity is claimed |

## Pipeline state model

- `SENT`: outbound message exists.
- `DELIVERY_FAILED`: message did not reach intended mailbox.
- `ROUTED`: recipient confirmed forwarding to a relevant internal team.
- `UNDER_ANALYSIS`: recipient confirmed the proposal is being reviewed.
- `DECLINED_CURRENT_NEED`: explicit negative current signal.
- `TIMING_SIGNAL`: recipient gave a timing constraint without current interest.
- `LOI`: only if an executed letter of intent exists.
- `PILOT_ACTIVE`: only if an actual pilot has been accepted/started.
- `CUSTOMER`: only if a customer contract/order exists.
- `ACQUISITION_OFFER`: only if a buyer has made an attributable offer.

## Current conclusions

```text
UNIQUE_OUTREACH_MESSAGES_IN_DEFINED_SCOPE=352
DELIVERY_FAILURE_MESSAGES_IN_DEFINED_SCOPE=22
B3_ROUTED_TO_RESPONSIBLE_TEAM=VERIFIED
SERVICENOW_ROUTED_TO_CORPORATE_DEVELOPMENT=VERIFIED
BPI_PILOT_PROPOSAL_UNDER_ANALYSIS=VERIFIED
ACTIVE_PILOT=NOT_CLAIMED
LOI=NOT_CLAIMED
ACQUISITION_OFFER=NOT_CLAIMED
CUSTOMER_REVENUE=NOT_CLAIMED
PIPELINE_REGISTER=PASS
SALES_OUTREACH_METRICS=PASS_WITH_SCOPE_BOUNDARY
CURRENT_BUYER_SIGNALS=PASS_WITH_QUALIFICATION
```
