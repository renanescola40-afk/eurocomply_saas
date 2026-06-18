# Billing entitlements response contract

`/api/billing/entitlements` is an authenticated tenant read endpoint. It does not mutate billing state, but it still returns organization-scoped plan and limit information that must not be cached by browsers, intermediaries or shared devices.

## Requirements

- authenticate the current Supabase user before resolving entitlements;
- derive the current organization from authenticated membership, not caller input;
- return stable public error codes for unauthenticated or missing-organization states;
- use `noStoreJson` for every response path, including errors;
- normalize non-finite entitlement limits to `null` before serializing JSON;
- keep regression tests for unauthorized, missing organization and successful entitlement responses.

## CI coverage

The route and tests are covered by `scripts/security/check-security-responses.mjs`, which is executed through `npm run security:responses` and therefore through `npm run security:ci`.
