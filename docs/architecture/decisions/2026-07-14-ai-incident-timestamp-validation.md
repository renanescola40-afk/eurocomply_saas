# AI incident timestamp validation

Date: 2026-07-14
Status: Proposed
Priority: P1 AI governance / evidence integrity

## Context

The AI incident creation route accepted an optional `detectedAt` value. Invalid values were silently replaced with the server's current time, and materially future timestamps were accepted. The resulting timestamp drives triage deadlines and is persisted as part of the incident chronology.

Silently repairing malformed chronology is unsafe for governance records: it can make an incident appear to have been detected later than reported, while future dates can defer generated review deadlines.

## Decision

Validate incident detection timestamps before creating the incident:

- omission or an empty optional value continues to mean the current server time;
- valid timestamps are normalized to UTC ISO-8601;
- malformed timestamps return HTTP 400;
- timestamps more than five minutes in the future return HTTP 400;
- five minutes of future clock skew is tolerated for distributed clients;
- no incident, deadline plan or audit event is created after validation fails.

The validation helper is deterministic when supplied a reference time and has focused unit coverage.

## Impact

This preserves truthful incident chronology and prevents generated triage deadlines from being based on invalid or materially future dates. Existing clients that omit `detectedAt` are unchanged. Clients sending malformed values must correct their payload instead of receiving a silently altered record.

No database migration, dependency, entitlement, RBAC, RLS, authentication or provider change is introduced.

## Security and privacy

The response exposes only a stable validation reason. It does not echo the supplied timestamp, customer data, tenant identifiers, prompts, model outputs, secrets or internal errors.

## Evidence boundary

Repository tests can prove deterministic validation behavior and route wiring. They do not prove production deployment, regulator acceptance, incident-response performance or the correctness of client clocks.

## Risks

- clients previously relying on silent repair will receive HTTP 400;
- the five-minute allowance is a policy choice and may need revision for specific integrations;
- historical records are not rewritten.

## Rollback

Revert this change. The route will again replace invalid timestamps with the current time and accept future timestamps. No schema rollback or data repair is required.
