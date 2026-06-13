# Disaster recovery test plan

Status: draft. Must be executed and approved before claiming disaster recovery is tested.

## Objective

Validate EuroComply's ability to respond to a major service disruption affecting the SaaS application or primary data services.

## Recovery objectives draft

| Objective | Draft target | Current status |
| --- | --- | --- |
| RTO | TBD by enterprise tier | Not tested |
| RPO | TBD by data store/provider | Not tested |
| Customer communication | TBD | Not tested |

## Scenario options

- Application hosting outage.
- Database availability outage.
- Object storage outage.
- Broken deploy requiring rollback.
- Compromised or leaked secret requiring rotation.
- Regional provider incident.

## Tabletop exercise procedure

1. Select scenario and test owner.
2. Freeze test window and notify internal participants.
3. Start incident timeline.
4. Declare severity and incident commander.
5. Validate runbooks for rollback, secret rotation, provider escalation, and customer communication.
6. Record decisions, time to detection, time to mitigation, and blockers.
7. Produce remediation backlog.
8. Approve test report.

## Technical failover/restore procedure draft

1. Confirm backup/restore readiness.
2. Confirm infrastructure-as-code or deployment recovery path.
3. Restore service in isolated recovery target or alternate region where supported.
4. Validate authentication, organization data, documents, billing-safe behavior, audit writes, and core user flows.
5. Record observed RTO/RPO.

## Evidence template

| Field | Value |
| --- | --- |
| Test date | TBD |
| Scenario | TBD |
| Participants | TBD |
| Detection time | TBD |
| Mitigation time | TBD |
| RTO observed | TBD |
| RPO observed | TBD |
| Result | Not executed |
| Follow-up items | TBD |
| Approver | TBD |

## Customer-safe answer while untested

EuroComply has a documented disaster recovery test plan, but a formal DR test has not yet been executed.
