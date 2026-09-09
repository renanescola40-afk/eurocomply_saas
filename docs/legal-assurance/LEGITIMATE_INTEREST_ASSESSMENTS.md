# RISCK COMPLY — Legitimate Interest Assessments (Article 6(1)(f))

Date: 2026-09-09  
Status: `PRE_REVIEW_LIA_PACK` — attributable internal assessment, not counsel approval or a final legal opinion.

## Legal method

Article 6(1)(f) GDPR requires three cumulative conditions: a legitimate interest, necessity of the processing for that interest, and a balance in which the data subject's interests or fundamental rights and freedoms do not override the controller/third-party interest. Recital 47 requires attention to reasonable expectations and careful assessment. Recital 49 specifically recognises strictly necessary and proportionate network/information-security processing as a legitimate interest.

Official primary source: Regulation (EU) 2016/679, Article 6 and Recitals 47/49, EUR-Lex.  
https://eur-lex.europa.eu/eli/reg/2016/679/oj

Guidance source: EDPB Guidelines 1/2024, Version 1.0, on Article 6(1)(f). The guidance is used as a structured assessment aid and not treated as legislation or external approval.  
https://www.edpb.europa.eu/public-consultations/guidelines-12024-on-processing-of-personal-data-based-on-article-61f-gdpr_en

## LIA-SEC-01 — Security, abuse and fraud prevention

### Interest

Protect RISCK COMPLY, customer tenants, users, authentication, billing interfaces and infrastructure against account abuse, unauthorised access, fraud, credential attacks, cross-tenant access attempts and malicious use.

`INTEREST=LEGITIMATE_CANDIDATE_STRONG`

The interest is concrete and linked to the operation of a multi-tenant B2B SaaS. GDPR Recitals 47 and 49 provide direct support for fraud prevention and strictly necessary/proportionate network and information security processing as legitimate interests.

### Necessity

Expected data is limited to security-relevant account/session/request metadata and security events needed to authenticate, authorise, rate-limit, investigate or prove abuse/security outcomes. Existing technical controls include tenant scoping, RBAC, RLS, rate limiting, step-up and audit/security evidence.

Less intrusive alternatives are preferred where they can achieve the same protection. Raw customer content must not be collected into security telemetry merely because it is available. Security logs should avoid secrets and unnecessary payloads.

`NECESSITY=PASS_PRE_REVIEW_WITH_MINIMISATION_DEPENDENCY`

### Balancing

Factors supporting the controller interest:

- users of an authenticated multi-tenant service can reasonably expect proportionate authentication and security monitoring;
- the purpose protects the same users and customer organisations whose data may be affected by an attack;
- processing is defensive rather than for unrelated profiling/advertising;
- access to security evidence is restricted and auditable.

Factors that could increase impact:

- excessive retention;
- broad IP/device tracking beyond security need;
- reuse for employee/customer scoring unrelated to security;
- collection of raw customer content or special-category data into telemetry;
- decisions with significant effects based solely on automated risk signals.

Required safeguards:

- data minimisation;
- role/tenant access controls;
- retention criteria tied to security purpose and legal claims rather than indefinite storage;
- no marketing reuse;
- documented objection handling and case review where Article 21 applies;
- human review for material account actions where context requires it.

`BALANCING=PASS_PRE_REVIEW_IF_SAFEGUARDS_MAINTAINED`

### Provisional result

```text
LIA_SEC_01=SUPPORTABLE_PRE_REVIEW
FINAL_LEGAL_BASIS=PENDING_EXTERNAL_REVIEW
RETENTION_DEPENDENCY=OPEN
```

## LIA-INC-01 — Incident response and security evidence

### Interest

Investigate security incidents, establish what occurred, protect affected tenants/users, preserve defensible evidence, prevent recurrence and establish/exercise/defend legal claims where relevant.

`INTEREST=LEGITIMATE_CANDIDATE_STRONG`

### Necessity

Incident handling cannot be performed reliably without preserving a bounded record of relevant events, decisions, affected systems, notifications and remediation. The current breach/security model intentionally separates incident evidence from ordinary customer content and requires access control/auditability.

The assessment does **not** classify all incident evidence under Article 6(1)(c). A legal-obligation basis may apply only where a concrete statutory duty is identified for the particular record or notification.

`NECESSITY=PASS_PRE_REVIEW`

### Balancing

The purpose directly protects data subjects and organisations. The main balancing risk is over-retention or excessive evidence capture after an incident is resolved.

Required safeguards:

- collect only incident-relevant data;
- segregate/restrict incident evidence;
- preserve immutable evidence only where integrity/accountability requires it;
- redact/minimise unnecessary identifiers;
- establish a documented retention/legal-hold criterion;
- do not repurpose incident evidence for unrelated employee/customer profiling.

`BALANCING=PASS_PRE_REVIEW_WITH_RETENTION_DEPENDENCY`

### Provisional result

```text
LIA_INC_01=SUPPORTABLE_PRE_REVIEW
SPECIFIC_ART6_1C_OBLIGATIONS=CASE_BY_CASE
RETENTION_DEPENDENCY=OPEN
FINAL_LEGAL_BASIS=PENDING_EXTERNAL_REVIEW
```

## LIA-B2B-01 — B2B relationship/procurement administration

### Interest

Respond to and administer genuine business enquiries, procurement/security questionnaires, vendor/customer due diligence and ongoing named-contact communications necessary to manage a B2B commercial relationship.

`INTEREST=LEGITIMATE_CANDIDATE`

### Necessity

A limited business contact record and correspondence history can be necessary to route the enquiry, respond, avoid duplicate/conflicting outreach and maintain procurement evidence. Where the data subject personally requests pre-contract steps, Article 6(1)(b) may be the more appropriate basis for that specific processing; this LIA does not displace it.

No necessity is established here for purchased marketing lists, large-scale enrichment, unrelated profiling or indefinite retention of dormant leads.

`NECESSITY=PASS_PRE_REVIEW_FOR_NARROW_RELATIONSHIP_ADMIN`

### Balancing

A professional contact who initiates or participates in a procurement/business relationship can generally expect proportionate follow-up about that relationship. Impact rises materially where communication becomes unsolicited marketing, uses private contact channels, is persistent after objection/opt-out, or combines external enrichment data.

Required safeguards:

- use business-context contact details only where appropriate;
- keep sales/procurement administration distinct from non-essential marketing;
- honour objections/opt-outs and suppression requirements;
- minimise dormant-lead retention;
- do not treat this LIA as proof of compliance with ePrivacy/Portuguese electronic-marketing rules.

`BALANCING=PASS_PRE_REVIEW_FOR_RELATIONSHIP_ADMIN_ONLY`

### Provisional result

```text
LIA_B2B_01=SUPPORTABLE_PRE_REVIEW_FOR_RELATIONSHIP_ADMIN
DIRECT_MARKETING=NOT_CLOSED_BY_THIS_LIA
EPRIVACY_PORTUGAL=SEPARATE_BLOCKER
FINAL_LEGAL_BASIS=PENDING_EXTERNAL_REVIEW
```

## Excluded from positive LIA credit

The following are deliberately **not** approved by this pack:

- optional product analytics where cookie/ePrivacy/configuration facts are unresolved;
- non-essential direct marketing beyond narrow relationship administration;
- special-category data processing;
- employee surveillance;
- automated decisions with legal or similarly significant effects;
- broad public-source enrichment;
- customer workspace processing performed solely as processor on customer instructions.

## Pack terminal state

```text
LIA_METHOD=PASS_DOCUMENTED
LIA_SECURITY_ABUSE=PASS_PRE_REVIEW
LIA_INCIDENT_RESPONSE=PASS_PRE_REVIEW_WITH_RETENTION_DEPENDENCY
LIA_B2B_RELATIONSHIP_ADMIN=PASS_PRE_REVIEW
LIA_ANALYTICS=BLOCKED_CONFIGURATION_AND_EPRIVACY
LIA_DIRECT_MARKETING=BLOCKED_EPRIVACY_PORTUGAL
LEGITIMATE_INTEREST_ASSESSMENTS=PASS_PRE_REVIEW_PARTIAL_SCOPE
FINAL_ART6_1F_APPROVAL=PENDING_EXTERNAL_REVIEW
```

Material changes in purpose, data categories, monitoring intensity, recipients, retention, automated effects or data-subject expectations require the relevant LIA to be reopened.