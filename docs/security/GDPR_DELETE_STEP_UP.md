# EuroComply GDPR Delete Step-Up Control

This document defines the step-up requirement for GDPR deletion requests.

## Purpose

A GDPR deletion request is a high-risk privacy operation. Even when the request does not immediately delete data, it starts a compliance workflow that can lead to account, organization, document, audit or billing data review and removal.

To reduce the risk of compromised or unattended sessions initiating destructive privacy workflows, GDPR delete requests require a recent signed step-up token.

## Covered Endpoint

| Endpoint | Action |
| --- | --- |
| `POST /api/gdpr/delete-request` | Request GDPR deletion review |

## Required Controls

The endpoint must enforce:

- authenticated user
- organization context
- GDPR self-service entitlement
- trusted origin validation
- signed step-up token for `gdpr_delete`
- no-store JSON response
- audit event for the request
- user notification after request receipt

## Step-Up Token Scope

The signed token must be scoped to:

```txt
action = gdpr_delete
userId
organizationId
verifiedAt
```

The implementation uses:

```txt
requireStepUpForRequest()
```

## Audit Evidence

The audit event should include:

```txt
stepUpAction
stepUpVerifiedAt
stepUpTokenType = signed_hmac
```

This gives compliance reviewers evidence that the delete request was made after a recent step-up verification.

## Response Evidence

The response should include:

```txt
stepUp.action
stepUp.verifiedAt
stepUp.expiresAt
stepUp.tokenType = signed_hmac
```

## Future Work

- Add explicit audit events for failed step-up attempts.
- Connect the UI MFA/reauthentication flow to step-up token issuance.
- Add administrator approval workflow evidence.
- Add legal hold and retention checks to the deletion review workflow.
