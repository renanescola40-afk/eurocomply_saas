# RISCK COMPLY — Personal Data Breach Procedure

Date: 2026-09-09  
Baseline: GDPR Articles 33 and 34. This procedure distinguishes a security incident from a reportable personal-data breach.

## 1. Trigger

Any suspected loss of confidentiality, integrity or availability involving personal data enters privacy triage. A general service incident is **not** automatically a personal-data breach.

## 2. Immediate actions

1. open an incident record and assign incident lead;
2. preserve deployment SHA, provider/event IDs, relevant logs and timestamps;
3. contain exposure and stop further unauthorised processing where safely possible;
4. identify affected tenant(s), systems, categories of personal data and data subjects;
5. record when RISCK COMPLY first became aware of facts sufficient to identify a likely personal-data breach;
6. determine RISCK COMPLY's role for the affected processing activity using `DATA_ROLE_MATRIX.md`.

## 3. Controller-side assessment

Where RISCK COMPLY is controller for the affected processing:

- assess likelihood and severity of risk to rights and freedoms;
- document the reasoning whether notification to the competent supervisory authority is required;
- where notification is required, prepare the Article 33 notification without undue delay and, where feasible, within 72 hours after awareness;
- if later than 72 hours, document reasons for delay;
- if high risk to individuals is likely, assess Article 34 communication to affected data subjects unless a statutory exception applies.

No automatic regulator or data-subject notification occurs merely because an incident was declared.

## 4. Processor-side assessment

Where RISCK COMPLY acts as processor for customer-controlled personal data:

- notify the relevant controller/customer **without undue delay** after becoming aware of a personal-data breach;
- provide available facts needed for the controller's Article 33/34 assessment;
- continue updates as material facts become available;
- do not independently represent that the customer's regulator notification duty is closed unless authorised and legally appropriate.

Contractual notification targets may be stricter than GDPR and remain a DPA/commercial gate until approved.

## 5. Required fact set

Record, as available:

- incident ID and timestamps;
- discovery source and awareness time;
- affected environment/release SHA;
- affected customer/workspace identifiers using minimum necessary metadata;
- categories and approximate number of data subjects;
- categories and approximate number of personal-data records;
- nature of confidentiality/integrity/availability impact;
- likely consequences;
- containment and remediation measures;
- encryption/pseudonymisation or other protective measures relevant to residual risk;
- role allocation: controller / processor / mixed;
- supervisory-authority notification decision, reason, date/time and reference if applicable;
- data-subject communication decision and reason;
- customer notification decision and timestamps;
- follow-up actions and closure owner.

## 6. Evidence preservation

Follow `docs/INCIDENT_RESPONSE.md` for operational evidence. Do not copy raw customer data, secrets, tokens or unnecessary PII into tickets, CI artifacts or breach summaries.

## 7. Decision states

Every privacy incident receives one state:

- `SECURITY_INCIDENT_NO_PERSONAL_DATA`;
- `PERSONAL_DATA_BREACH_LOW_RISK_DOCUMENT_ONLY`;
- `PERSONAL_DATA_BREACH_CONTROLLER_NOTIFICATION_REQUIRED`;
- `PERSONAL_DATA_BREACH_HIGH_RISK_DATA_SUBJECT_NOTICE_REQUIRED`;
- `PROCESSOR_CUSTOMER_NOTIFICATION_REQUIRED`;
- `FACTS_INCOMPLETE_ESCALATE`.

## Terminal gate

```text
GDPR_BREACH_PROCESS=PASS_DOCUMENTED
TABLETOP_EXECUTION_EVIDENCE=PENDING
CONTRACTUAL_BREACH_TARGETS=PENDING_EXTERNAL_REVIEW
```

The procedure is operationally usable now. Final enterprise assurance still requires execution/tabletop evidence and any contract-specific targets.