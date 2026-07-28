# Billing API Route Inventory

This module extends `API_ROUTE_INVENTORY.md` for billing lifecycle endpoints. Every entry is validated by the same fail-closed BOLA/IDOR scanner.

| Route | Class | Notes |
| --- | --- | --- |
| `src/app/api/billing/catalog/route.ts` | public safe | Public pricing and add-on metadata only; Stripe/provider identifiers and tenant data are excluded, responses are no-store, and distributed per-IP rate limiting is enforced. |
| `src/app/api/billing/subscription/route.ts` | high-risk | Subscription lifecycle mutation requires authenticated server-derived organization context, `manage_billing`, trusted mutation, bounded Zod input, fail-closed billing rate limiting, step-up authentication, server-owned Stripe identifiers, audit persistence and no-store responses. |
