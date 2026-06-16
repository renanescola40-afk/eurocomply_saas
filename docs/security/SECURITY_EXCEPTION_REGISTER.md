# Security Exception Register

Security exceptions are temporary, explicit and owned. They must not become invisible backlog.

## Exception rule

A security exception is allowed only when all fields below are filled and approved before release:

| Field | Required |
| --- | --- |
| Exception id | Yes |
| Control affected | Yes |
| Risk description | Yes |
| Affected systems or endpoints | Yes |
| Compensating control | Yes |
| Owner | Yes |
| Approver | Yes |
| Expiry date | Yes |
| Review cadence | Yes |
| Closure evidence | Yes |

## Automatic No-Go cases

Do not approve production release when any of these are open without an approved exception:

- public secret exposure;
- missing authentication on non-public API routes;
- missing tenant ownership check on resource identifiers;
- missing RLS policy for tenant data;
- public sensitive storage bucket;
- missing production rollback owner;
- missing incident commander;
- production deploy without protected environment approval;
- disabled security CI;
- untriaged critical or high production dependency vulnerability.

## Register

| ID | Control | Risk | Compensating control | Owner | Approver | Expiry | Status | Closure evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SEC-EX-000 | Template only | Do not use as an active exception | n/a | n/a | n/a | n/a | Closed | This row documents required format |

## Review cadence

- Critical exceptions: review daily until closed.
- High exceptions: review twice weekly.
- Medium exceptions: review weekly.
- Low exceptions: review before the next release.

## Closure rule

An exception may be closed only when the compensating control is replaced by the target control or the risk is removed. Link the fixing pull request, release evidence and validation output.
