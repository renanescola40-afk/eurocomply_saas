# Operations Ownership

- Status: Accepted
- Effective date: 2026-07-15
- Review cadence: Quarterly and before every enterprise release
- Escalation authority: Release owner

## Purpose

This document assigns accountable operational roles for RISCK COMPLY. Named people may change, but every production or enterprise release must bind these roles to identifiable owners in the release approval record before deployment.

## Required accountable roles

| Role | Accountable responsibility | Required coverage | Escalation target |
| --- | --- | --- | --- |
| Incident owner | Own incident declaration, severity, coordination, decision log and closure | Every production incident | Release owner |
| Technical owner | Own diagnosis, mitigation and technical validation | Every SEV-1 and SEV-2 | Incident owner |
| Security and privacy owner | Own containment and disclosure decisions for auth, tenant isolation, audit, malware, secrets or suspected data exposure | Security-sensitive incidents | Incident owner and release owner |
| Billing owner | Own Stripe, subscription, entitlement, payment and invoice incidents | Billing incidents | Incident owner |
| Rollback owner | Own rollback execution and post-rollback health validation | Every production release | Incident owner and release owner |
| Evidence owner | Preserve sanitized logs, request IDs, provider references, command outputs and exact-SHA evidence | Every SEV-1 and SEV-2 | Incident owner |
| Support owner | Own inbound triage, customer impact grouping and support handoff | Customer-visible incidents | Customer communication owner |
| Customer communication owner | Own external updates, status wording and approval of customer-facing incident communications | Customer-visible SEV-1 and SEV-2 | Incident owner and release owner |
| Observability owner | Own alert routing, Sentry/logging health and monitoring fallbacks | Production monitoring | Incident owner |
| Database owner | Own Supabase availability, migration and recovery decisions | Database incidents | Technical owner |

## Release binding requirement

A release is No-Go unless the release approval record identifies the incident owner, rollback owner, support owner and customer communication owner, and includes a reachable escalation path. Enterprise releases must also identify security/privacy, evidence, observability, billing and database ownership.

Repository role names are not substitutes for real people. The protected release record must bind each required role to a current accountable person or approved on-call rotation without storing personal phone numbers, credentials or private contact details in the public repository.

## Incident activation

For SEV-1 and SEV-2 incidents:

1. assign the incident owner and technical owner immediately;
2. assign security/privacy, billing or database ownership when the affected surface requires it;
3. identify rollback, evidence, support and customer communication owners;
4. record the escalation path and decision log;
5. do not close the incident until mitigation, customer impact, evidence preservation and follow-up ownership are recorded.

## Handover and absence

Every accountable role must have a documented delegate or on-call rotation in the protected operational system. If the primary owner is unavailable, responsibility transfers explicitly; it must never become implicitly unowned.

## Review and evidence

The enterprise scorecard automation validates this document together with the incident response runbook. The generated evidence records only role names, policy checks, content digests and exact-SHA provenance. It must not store private contact details, credentials, tokens, incident payloads or customer data.

## Risks and trade-offs

- Repository policy proves the ownership model exists, not that every future release has correctly assigned people.
- A small team may assign several roles to one person, increasing concentration and availability risk.
- Public role descriptions intentionally exclude private escalation channels and personal contact information.
- Runtime exercises and release approval evidence remain necessary to prove the model operates in practice.

## Rollback

Reverting this document removes the canonical ownership policy and returns OPS-10 to unverified. It does not change application runtime, provider configuration, customer data, database schema or credentials.