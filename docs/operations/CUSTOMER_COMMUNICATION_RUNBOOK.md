# Customer Communication Runbook for SEV-1 and SEV-2

## Purpose

This runbook defines how EuroComply communicates with customers during SEV-1 and SEV-2 incidents. The communication owner is responsible for accuracy, timing, tone and safe content.

## Communication principles

- Be factual and concise.
- Acknowledge impact before root cause is known.
- Do not speculate.
- Do not include secrets, stack traces, raw cookies, bearer tokens, customer PII or internal exploit detail.
- Use customer-visible language: login, dashboard, uploads, billing, exports, evidence packs, API readiness.
- Keep a timestamped record of every message.

## Severity communication triggers

| Severity | Trigger | External update expectation |
| --- | --- | --- |
| SEV-1 | Broad outage, security/data isolation risk, audit-chain integrity risk, widespread billing integrity issue | Initial update after impact confirmation, regular updates until mitigated, final resolution note |
| SEV-2 | Significant customer-facing degradation, protected flow unavailable, webhook/upload/scanner issue affecting customers | Targeted update to affected customers or status channel, update on mitigation and resolution |

## Required owners

A SEV-1 or SEV-2 communication must identify:

- incident commander;
- customer communication owner;
- rollback owner;
- technical lead;
- legal/privacy/security owner when data protection or tenant isolation is involved.

Release is **No-Go** if the release record does not name incident and rollback owners.

## Message approval

| Incident type | Required approval |
| --- | --- |
| General outage/degradation | Incident commander |
| Billing/subscription issue | Incident commander + billing owner |
| Upload/content-scanning issue | Incident commander + security owner |
| Tenant isolation, RLS, audit-chain or suspected data exposure | Incident commander + security/privacy/legal owner |

## Initial customer update template

```txt
We are investigating an issue affecting <affected surface>. The issue started around <time/UTC or local>. Our team has assigned an incident owner and is working on mitigation.

Current impact: <brief customer-visible impact>.

We will provide another update by <time> or sooner if the status changes.
```

## Mitigation / rollback update template

```txt
We have identified the likely cause of the issue affecting <affected surface> and are applying a mitigation.

Current action: <rollback / configuration fix / dependency recovery / temporary disablement of affected operation>.

Customer impact at this time: <impact summary>.

Next update: <time>.
```

## Security-sensitive holding statement

Use this when tenant isolation, audit-chain integrity, upload scanning, auth or suspected data exposure is being investigated and facts are not complete.

```txt
We are investigating a security-sensitive issue affecting <affected surface>. We have contained the affected area while we verify impact and evidence. At this stage, we are not sharing technical details that could increase risk.

We will provide confirmed impact details and next steps as soon as they are validated.
```

## Resolution update template

```txt
The issue affecting <affected surface> has been resolved as of <time>. We have validated the affected customer flows and monitoring has returned to normal.

Impact summary: <what customers experienced>.

Mitigation: <high-level action taken, without secrets or exploit detail>.

Follow-up: <whether a post-incident review or customer-specific follow-up will be shared>.
```

## Post-incident customer follow-up

For SEV-1 incidents, prepare a customer-facing incident summary that includes:

- incident window;
- affected services/customer flows;
- impact summary;
- mitigation and recovery summary;
- preventive actions;
- support contact path.

For incidents involving possible data exposure, route through security/privacy/legal review before sending.

## Do-not-share list

Never share:

- secret names with values;
- bearer tokens, cookies or session identifiers;
- raw request bodies;
- Sentry stack traces or full exception payloads;
- Supabase service role details;
- Stripe webhook secrets or customer payment metadata beyond what is required for support;
- exploit reproduction steps before a fix is deployed and reviewed.

## Evidence record

The communication owner must add to the incident record:

- first external update timestamp;
- recipient/customer group;
- content or link to sent message;
- approver;
- closure message timestamp;
- any customer-specific follow-up owner.
