# Enterprise Break-Glass API Route Inventory

| Route | Class | Notes |
| --- | --- | --- |
| `src/app/api/team/break-glass/route.ts` | admin-only | Tenant emergency-access request creation and listing; requires authenticated organization context, `manage_team`, trusted mutation for POST, bounded JSON, distributed fail-closed rate limiting, step-up authentication, server-derived tenant scope, service-role persistence and no-store responses. |
| `src/app/api/team/break-glass/[requestId]/decision/route.ts` | high-risk | Emergency-access approval or rejection; requires UUID validation, authenticated organization context, `manage_team`, trusted mutation, distributed fail-closed rate limiting, step-up authentication, requester/approver separation, tenant-scoped persistence and no-store responses. |
| `src/app/api/team/break-glass/[requestId]/revoke/route.ts` | high-risk | Immediate emergency-access revocation; requires UUID validation, authenticated organization context, `manage_team`, trusted mutation, distributed fail-closed rate limiting, step-up authentication, tenant-scoped transition, post-incident-review scheduling and no-store responses. |
| `src/app/api/internal/enterprise-break-glass/expire/route.ts` | health/internal | Internal emergency-access expiry worker; requires fail-closed internal authentication rate limiting, cron authorization, bounded batch size, concurrency-safe processing, sanitized errors and no-store responses. |
