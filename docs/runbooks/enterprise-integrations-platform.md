# Enterprise Integrations Platform Runbook

## Scope

Operate organization API credentials, service accounts, outbound webhooks, SSO connections and SCIM provisioning without bypassing tenant isolation or exposing secrets.

## Health indicators

- no active credential is expired or attached to a revoked service account;
- webhook pending/retryable age remains within the agreed delivery objective;
- no delivery lease remains stale;
- dead-letter volume and signature failures remain below alert thresholds;
- no enforced SSO connection is inactive or unverified;
- no SCIM token remains active after connection revocation;
- integration audit hash-chain checks have no gap.

## Credential incident

1. Identify the organization and credential prefix; never request plaintext.
2. Revoke the affected credential immediately.
3. Suspend the service account when compromise scope is uncertain.
4. Issue a replacement with minimum scopes and a bounded expiry.
5. Search audit events and last-used metadata using hashes, not raw IP addresses.
6. Assess cross-tenant access and escalate as a security incident when suspected.

## Webhook delivery failure

1. Confirm endpoint ownership and HTTPS configuration.
2. Inspect delivery status, event ID, attempt count, next attempt and stable error code.
3. Retry only with the same event ID and idempotency key.
4. Do not edit payloads after the original digest was recorded.
5. Move to dead letter after the configured maximum attempts.
6. Redrive only after the destination issue is resolved and an operator records the action.

## Signature failures and replay

Reject missing, malformed, expired or future timestamps and invalid HMAC signatures. Never widen the replay window beyond 15 minutes. Repeated failures from one integration should pause the subscription and generate a security event.

## SSO and SCIM recovery

- never enable SSO enforcement before verified-domain and provider metadata checks pass;
- maintain an owner break-glass path protected by MFA and audit;
- revoke SCIM tokens when a connection is suspended or deleted;
- deprovisioning must disable access promptly while preserving required audit history;
- role mappings must fail closed for unknown groups.

## Rollback

Disable the affected subscription, connection or service account first. Reverting the migration is destructive and is not an operational rollback. Database rollback requires a reviewed forward migration and backup verification.

## Evidence

Capture exact commit SHA, migration identifier, test command/results, RLS validation, credential lifecycle checks, webhook replay/idempotency checks, SSO domain verification and SCIM provisioning/deprovisioning outcomes. Never retain plaintext credentials, webhook secrets, assertion contents or customer payloads.
