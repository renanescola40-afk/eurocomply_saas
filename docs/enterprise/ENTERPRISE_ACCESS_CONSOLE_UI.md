# Enterprise Access Operations Console

## Purpose

The organization Team page now combines ordinary member administration with the Enterprise access operations plane. Administrators can review access-runtime health, active alerts, seat-contention evidence and asynchronous evidence exports without leaving the tenant-scoped workspace.

## Operator workflow

1. Open `/{locale}/dashboard/organizations/team`.
2. Review success rate, p95 duration, oldest pending operation and dead-letter count.
3. Acknowledge an alert when ownership is accepted.
4. Resolve an alert only with a durable reason.
5. Review seat-contention totals before increasing or reallocating contract capacity.
6. Request CSV or JSONL evidence exports through step-up authentication.
7. Refresh the console after worker execution or incident remediation.

## Security boundaries

- The browser never sends or chooses `organization_id`.
- Tenant scope is resolved from the authenticated user on every API request.
- Alert mutations and export requests require `manage_team` and step-up authentication.
- API reads use `cache: no-store` and the page is force-dynamic.
- The console does not expose storage paths, provider URLs or unsigned downloads.
- Export integrity is displayed only after the backend records SHA-256 evidence.
- Page errors state explicitly that no access mutation was performed.

## UX states

- Skeleton loading state for the page shell and operational panels.
- Local refresh state that does not blank existing evidence.
- Sanitized error alert with safe retry.
- Empty states for alerts, contention and export jobs.
- Responsive cards and horizontally scrollable evidence table.
- Accessible labels for loading, errors and alert-resolution reasons.

## SLO interpretation

- Success rate target: at least 95%.
- Queue warning: oldest pending operation at or above 15 minutes.
- Queue critical: oldest pending operation at or above 60 minutes.
- Dead-letter tolerance: zero unreviewed.
- Export expiry: 24 hours after artifact completion.

## External validation still required

- Real Entra ID, Okta and Google Workspace group flows.
- Production-like 10,000-identity execution.
- Live concurrent final-seat reservation test against Supabase.
- Configured email/webhook delivery adapters.
- Signed storage download implementation and provider verification.
- Browser E2E execution with authenticated Enterprise fixtures.
