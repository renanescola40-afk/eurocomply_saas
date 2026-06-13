# Release Support Readiness

This document defines the support readiness requirements for promoting EuroComply to private beta, public production, or enterprise release.

## Purpose

Release support readiness ensures that customer-facing and internal teams can triage, route, resolve, and evidence post-release issues without improvisation.

A release is not support-ready if the team cannot answer:

- Who owns customer support during the release window?
- How are customer issues classified?
- When is an issue escalated to engineering, security, compliance, or incident response?
- What evidence must be retained?
- Which issues block release promotion?

## Required roles

Every release must identify:

- Release owner
- Customer support owner
- Engineering escalation owner
- Security/compliance escalation owner
- Billing escalation owner
- Incident commander backup
- Customer communication owner

## Support intake channels

Before release, define the active intake channels:

- Support email or ticketing system
- Customer success contact path
- Security contact path
- Billing support path
- Internal escalation channel
- Emergency incident channel

If any channel is not operational, the release must be marked Conditional Go or No-Go depending on customer impact.

## Support severity levels

### Support P1

Customer cannot access core product, critical compliance evidence, billing, or security functionality.

Examples:

- Login outage affecting multiple customers
- Organization data isolation concern
- Broken audit evidence export
- Failed billing checkout for active customers
- Suspected unauthorized access

Default action:

- Escalate to incident response
- Notify release owner
- Assess rollback
- Preserve evidence

### Support P2

Major feature degraded but workaround exists.

Examples:

- Slow document processing
- Non-critical export failure
- Isolated upload issue
- Billing portal issue with manual workaround

Default action:

- Assign engineering owner
- Track workaround
- Review communication need

### Support P3

Minor bug, documentation question, usability issue, or non-blocking problem.

Default action:

- Log ticket
- Triage in normal support queue
- Include in post-release review if repeated

## Escalation matrix

| Signal | Escalate to | Required action |
| --- | --- | --- |
| Security or privacy concern | Security/compliance owner | Preserve evidence and assess incident severity |
| Billing or payment failure | Billing owner | Verify Stripe state and customer impact |
| Data isolation concern | Engineering + security | Treat as potential SEV until disproven |
| Audit-chain integrity concern | Engineering + compliance | Run audit-chain verification and preserve outputs |
| Upload scanning issue | Engineering + security | Confirm scanning mode and fail-open/fail-closed behavior |
| Repeated customer complaints | Release owner | Decide whether to pause rollout |

## Evidence requirements

For each P1 or P2 support issue, retain:

- Ticket ID
- Customer or organization ID if applicable
- Timestamp reported
- Timestamp acknowledged
- Owner assigned
- Severity
- Affected feature
- Workaround status
- Resolution summary
- Related incident ID if promoted to incident
- Related release commit SHA

## Release readiness requirements

Before promotion, the release package must include evidence that:

- Support owner is assigned
- Escalation owners are assigned
- Intake channels are known
- P1/P2 severity definitions are available
- Rollback owner is known
- Customer communication owner is known
- Billing escalation path is known
- Security/compliance escalation path is known

## Automatic No-Go conditions

A release must not be promoted if:

- No support owner is assigned
- No engineering escalation owner is assigned
- No security/compliance escalation owner is assigned
- No rollback owner is assigned
- Support intake is not operational for target customers
- P1 support issues remain unresolved from the same release candidate
- Customer communication path is undefined for production or enterprise release

## Conditional Go conditions

A release may proceed only with explicit approval if:

- Support is available only during limited hours
- A workaround exists for a known P2 issue
- Billing escalation is manual
- Customer communication is handled manually instead of via a status page

Conditional Go requires an accepted exception in `docs/RELEASE_APPROVAL_RECORD.md`.

## Post-release support review

Within the first release review window, the release owner must collect:

- Number of P1/P2/P3 issues
- Repeated customer themes
- Escalations triggered
- Rollbacks considered or executed
- Customer communication sent
- Follow-up engineering work
- Follow-up documentation work

This review feeds into `docs/RELEASE_POST_INCIDENT_REVIEW.md` when issues are incident-level.

## Enterprise release rule

Enterprise release requires support readiness evidence. A release cannot be considered enterprise-ready if support escalation, incident response, rollback, customer communication, and evidence ownership are not defined.
