# RISCK COMPLY — Data Subject Rights Operational Matrix

Date: 2026-09-09  
Baseline: GDPR Chapter III. A written policy is not sufficient; each right is mapped to an operational path.

| Right / control | Current capability | State | Remaining gap |
|---|---|---|---|
| Intake | `comercial@risckcomply.com` is a verified reachable intake channel; workspace privacy UI also exists for scoped operations | PASS | Define formal privacy SLA/ownership and customer-controller routing |
| Identity verification | authenticated session plus step-up exists for sensitive in-product privacy operations | PASS_FOR_IN_PRODUCT | Email/manual requests need documented identity-verification procedure |
| Access | organisation-scoped GDPR export route and descriptor-driven export implementation exist | PASS_IMPLEMENTED | Validate subject-vs-organisation scope and manual requests where customer is controller |
| Portability | structured organisation export capability exists | PARTIAL | Determine applicability/data format per request and distinguish portability from general access/export |
| Rectification | account/profile/admin correction pathways exist conceptually; GDPR operational controls require rectification workflow | PARTIAL | Create explicit request routing and downstream correction propagation evidence |
| Erasure | authenticated delete-request intake with RBAC, trusted-origin, step-up, literal confirmation and safety delay exists | PASS_INTAKE_CONTROL | Full downstream deletion/anonymisation completion and provider propagation not yet proven end-to-end |
| Restriction | operational control specification requires restriction where applicable | NOT_TESTED | Implement/record restriction state and downstream propagation where legally applicable |
| Objection | Privacy draft identifies right subject to applicable law | NOT_TESTED | Create intake, legal-basis decision and suppression/restriction workflow for controller-side processing |
| Consent withdrawal | control specification requires revocable non-essential analytics consent where required | BLOCKED_CONFIGURATION | Confirm analytics/cookie configuration and prove withdrawal behavior |
| Automated-decision safeguards | provider states no intended solely automated website/account decisions with legal/similar effect | PASS_DOCUMENTED | Revalidate if account/product decisioning changes |
| Deadline tracking | no complete DSAR statutory deadline tracker evidence identified in this lane | BLOCKED | Add request date, due date, extension reason, status and completion evidence |
| Customer-controller routing | DPA draft states processor should assist and not substantively respond to customer-controlled data except on instruction/law | PASS_DOCUMENTED | Operational routing/SLA evidence required |
| Exceptions/legal hold | retention policy recognises billing, tax, fraud, audit-chain and legal-hold constraints | PARTIAL | Add case-by-case decision record and minimisation/restriction controls |
| Audit trail | export/delete actions are designed to record audit events without raw exported content | PASS_IMPLEMENTED | Release-bound runtime proof should be retained |

## Required operational record

For every rights request, record at minimum: request ID, received date, requester, identity-verification state, controller/processor routing, right invoked, scope, due date, extension if lawful, data sources searched, decision/exceptions, downstream provider actions, response date and evidence reference.

## Terminal state

```text
ACCESS_EXPORT=PASS_IMPLEMENTED
ERASURE_INTAKE=PASS_IMPLEMENTED
RECTIFICATION=PARTIAL
RESTRICTION=NOT_TESTED
OBJECTION=NOT_TESTED
PORTABILITY=PARTIAL
CONSENT_WITHDRAWAL=BLOCKED_CONFIGURATION
DEADLINE_TRACKING=BLOCKED
DATA_SUBJECT_RIGHTS=PARTIAL
```

The strongest current capabilities are secure export and deletion-request intake; the lane is not yet entitled to mark all Chapter III rights operationally PASS.