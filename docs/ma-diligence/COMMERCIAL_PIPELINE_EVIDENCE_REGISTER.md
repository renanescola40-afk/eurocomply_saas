# RISCK COMPLY — Commercial Pipeline Evidence Register

Date: 2026-10-08  
Source: connected corporate Gmail mailbox  
Purpose: M&A diligence commercial-fact evidence  
Status: `PIPELINE_EVIDENCE=VERIFIED_BUYER_CYCLE_DATASET`

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
| Banyan Software | 2026-10-08 | Corporate Development reviewed the supplied business picture and stated the opportunity does not fit its acquisition model at the current pre-commercial stage | `CLOSED_LOST_NOT_FIT` | No diligence, offer, LOI or active buyer process is claimed |
| Twilio | 2026-10-07 | Corporate Development requested a summary covering financial metrics, product use cases and team bios; requested materials were subsequently supplied | `HUMAN_INTEREST_MATERIALS_REQUESTED` | No NDA, diligence acceptance, offer or LOI is claimed |
| Temenos | 2026-10-06 | Head of M&A / Special Projects reviewed the opportunity and declined current strategic fit | `CLOSED_LOST_NOT_FIT` | No active opportunity is claimed |
| Mollie | 2026-10-07 | Human response explicitly declined the acquisition opportunity | `CLOSED_LOST_DECLINED` | No active opportunity is claimed |
| Bucher Industries | 2026-10-07 | Group Development declined because the opportunity does not match strategic focus | `CLOSED_LOST_NOT_FIT` | No active opportunity is claimed |
| Sartorius | 2026-10-07 | Corporate Development reviewed the material and declined because it does not see itself as the right owner/partner | `CLOSED_LOST_NOT_FIT` | No active opportunity is claimed |

## Observed first-response latency

Mailbox timestamps permit a bounded measurement of first-response latency for three attributable counterparties:

| Counterparty | Initial outbound | First verified inbound response | Approx. elapsed time | Diligence interpretation |
|---|---|---|---:|---|
| B3 | 2026-10-03 04:40:15 -07:00 | 2026-10-05 12:40:14 +00:00 | ~48h 59m 59s | Routed to responsible team; not a completed sales cycle |
| ServiceNow | 2026-09-22 01:18:22 -07:00 | 2026-09-22 15:49:41 +00:00 | ~7h 31m 19s | Routed to Corporate Development; not a completed sales cycle |
| Banco BPI | 2026-09-29 15:45:13 -05:00 | 2026-09-29 22:23:10 +01:00 | ~37m 57s | Pilot proposal under analysis; not a completed sales cycle |

### Additional observed buyer-response/outcome cycles — 2026-10-08

| Counterparty | Initial outbound | Attributable response/outcome | Approx. elapsed time | Observed outcome |
|---|---|---|---:|---|
| Banyan Software | 2026-10-07 10:28:33 -05:00 | 2026-10-08 08:37:50 +01:00 | ~16h 09m 17s | Human interest → additional information → explicit not-fit / closed-lost |
| Twilio | 2026-10-07 08:48:02 -07:00 | 2026-10-07 09:27:42 -07:00 | ~39m 40s | Human Corporate Development interest; materials requested |
| Temenos | 2026-10-03 06:51:47 -07:00 | 2026-10-06 16:46:25 +00:00 | ~74h 54m 38s | M&A review → explicit not-fit / closed-lost |
| Mollie | 2026-10-07 10:41:56 -04:00 | 2026-10-07 14:42:53 +00:00 | ~57s | Explicit decline / closed-lost |
| Bucher Industries | 2026-10-06 14:04:02 -04:00 | 2026-10-07 13:00:42 +00:00 | ~18h 56m 40s | Strategic-focus decline / closed-lost |
| Sartorius | 2026-10-06 11:14:47 -07:00 | 2026-10-07 15:10:38 +00:00 | ~20h 55m 51s | Corporate Development review → not-fit / closed-lost |

Boundary: this is an observed strategic-buyer response/outcome cycle dataset, not a customer conversion dataset. It does **not** prove customer sales-cycle duration, time-to-contract, time-to-LOI, procurement duration, revenue or win rate. For M&A diligence requirement #88, the dataset is now sufficient to answer the observed buyer-cycle question at the current stage, so requirement #88 can be CLOSED with that explicit scope boundary.

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
- `HUMAN_INTEREST_MATERIALS_REQUESTED`: substantive human interest plus a request for additional information/materials.
- `CLOSED_LOST_NOT_FIT`: attributable human review followed by explicit strategic/profile mismatch.
- `CLOSED_LOST_DECLINED`: attributable explicit decline.
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
OBSERVED_BUYER_CYCLE_DATASET=PASS
REQUIREMENT_88_SALES_CYCLE=CLOSED_WITH_BUYER_CYCLE_SCOPE_BOUNDARY
BANYAN_CURRENT_STAGE=CLOSED_LOST_NOT_FIT
TWILIO_CURRENT_STAGE=HUMAN_INTEREST_MATERIALS_REQUESTED
```
