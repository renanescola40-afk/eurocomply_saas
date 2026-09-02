# RISCK COMPLY — LinkedIn Marketing Operator

## Objective

Connect RISCK COMPLY to LinkedIn using the official LinkedIn Community Management / Posts API so the approved RISCK COMPLY Marketing Operator can schedule and publish organization posts, then read organization social activity for performance analysis, without exposing credentials to the browser or repository.

## Security model

- Credentials are server-only environment variables.
- No LinkedIn token or client secret may be committed to Git.
- Controlled one-off test publishing goes through `/api/internal/marketing/linkedin/publish`.
- Recurring publishing goes through the persistent `linkedin_marketing_posts` queue and `/api/internal/marketing/linkedin/process`.
- Connection readiness is inspected through `/api/platform/marketing/linkedin/status`.
- The connection status endpoint requires an authenticated platform actor with the `security` capability and a current AAL2 MFA session.
- The status endpoint never returns access-token or client-secret values. It returns configuration booleans, token activity/expiry/scopes and a non-mutating organization read-probe result only.
- Internal publishing routes use the existing internal authentication, fail-closed rate-limit and no-store controls.
- The queue has RLS enabled and browser roles receive no direct table privileges.
- Due posts are claimed atomically with `FOR UPDATE SKIP LOCKED` before provider publication.
- A network-uncertain LinkedIn outcome is moved to `needs_review` and is never automatically retried, preventing accidental duplicate posts.
- LinkedIn API failures are sanitized before returning to callers and sent to the existing observability path without provider response bodies.
- `LINKEDIN_API_VERSION` is explicit configuration rather than a hardcoded permanently-valid API version.

## Required LinkedIn authorization

For the intended marketing operation, request only the organization-social permissions needed for the current scope:

- `w_organization_social` — publish/manage organization social content;
- `r_organization_social` — read organization social content for verification and performance analysis.

The authenticated LinkedIn member must have an eligible role on the RISCK COMPLY LinkedIn Page and the LinkedIn Developer application must have approved Community Management API access for those scopes.

LinkedIn Marketing APIs use 3-legged OAuth member authorization. Do not substitute a client-credentials flow for this integration.

The official Posts API is used at `https://api.linkedin.com/rest/posts` with:

- `Authorization: Bearer ...`
- `LinkedIn-Version: YYYYMM`
- `X-Restli-Protocol-Version: 2.0.0`

The connection verifier also uses LinkedIn's official OAuth token introspection endpoint and a read-only Posts API finder request for the configured organization.

## Required production environment variables

```text
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_ORGANIZATION_URN=urn:li:organization:<numeric-id>
LINKEDIN_API_VERSION=<LinkedIn-supported YYYYMM version>
```

`LINKEDIN_CLIENT_SECRET` and `LINKEDIN_ACCESS_TOKEN` are secrets. Store them only in the production deployment secret store. Never paste them into source code, GitHub issues/PR comments, logs, browser-visible variables, or chat messages.

## First connection procedure

1. Create or select the LinkedIn Developer application owned by the business/operator responsible for RISCK COMPLY.
2. Associate/verify the RISCK COMPLY LinkedIn Page where required by LinkedIn.
3. Request/enable Community Management API access.
4. Confirm `r_organization_social` and `w_organization_social` are available to the application.
5. Configure the exact production OAuth redirect URI in the LinkedIn application.
6. Complete the LinkedIn 3-legged member authorization flow using an account with an eligible Page role.
7. Store `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` and the resulting access token only in the deployment secret store.
8. Resolve the RISCK COMPLY Page numeric organization id and configure `LINKEDIN_ORGANIZATION_URN`.
9. Set a currently supported `LINKEDIN_API_VERSION`.
10. Call `/api/platform/marketing/linkedin/status` from an AAL2 platform-security session and require `readyForControlledTest=true`.
11. Execute one controlled test post through the protected one-off publisher.
12. Record the returned LinkedIn post id and verify the Page rendering.
13. Confirm the queue worker can claim and publish one intentionally scheduled test item.
14. Enable recurring editorial scheduling only after the controlled post and worker evidence pass.

## Connection verifier

`GET /api/platform/marketing/linkedin/status` is read-only and returns a structure containing:

- whether each required environment item is configured;
- whether the organization URN and API version formats are valid;
- whether LinkedIn token introspection reports the token active;
- token expiry metadata when LinkedIn supplies it;
- granted scope names and whether both required organization-social scopes are present;
- whether a non-mutating Posts API read for the configured organization succeeds;
- `readyForControlledTest`, which is true only when the live connection gates above pass.

The endpoint does not publish, modify or delete LinkedIn content.

## Publishing request

The controlled one-off publisher accepts:

```json
{
  "text": "Post text"
}
```

A valid request returns HTTP 201 with the LinkedIn post id when LinkedIn exposes it in `x-restli-id`.

## Autonomous editorial queue

`public.linkedin_marketing_posts` is the canonical server-side queue. Important fields include:

- `body`: final post copy;
- `status`: `draft`, `scheduled`, `publishing`, `published`, `failed`, `needs_review` or `cancelled`;
- `scheduled_for`: UTC publication eligibility time;
- `idempotency_key`: unique deterministic key that prevents the same planned post from being queued twice;
- `autonomy_policy_version`: policy version that authorized scheduling;
- `created_by`: operator/audit provenance;
- `linkedin_post_id`: provider identifier after successful publication;
- `last_error_code`: sanitized operational failure classification.

The Vercel production cron calls the protected processor every 15 minutes. The processor publishes only rows already in `scheduled` state whose `scheduled_for` time has arrived. It never invents or changes post copy during publication.

## Current queue evidence — 2026-09-02

`QUEUE_READY=true` is evidence-backed in Production:

- migration `20260902202558_reconcile_linkedin_marketing_queue_runtime` is present in the Production migration ledger;
- `public.linkedin_marketing_posts` exists with RLS enabled;
- `anon` and `authenticated` have no direct SELECT privilege;
- `service_role` has the required CRUD access;
- `claim_linkedin_marketing_posts(integer)` is executable by `service_role` and denied to browser roles;
- the queue was empty at verification time, so no post was accidentally scheduled or published during activation.

## Operator policy

Owner intent for this integration is **high marketing autonomy** after the connection gates below pass. The operator may create an editorial plan, draft final copy, schedule posts and publish scheduled content without per-post approval when the content remains inside this policy.

Factual assertions must remain evidence-backed. Never publish claims that RISCK COMPLY:

- has a customer, partner, certification, legal approval, regulatory approval, pentest result, security status, market result, funding event, or enterprise customer unless that fact is verified;
- guarantees EU AI Act compliance;
- replaces legal counsel or promises a legal outcome;
- has completed an assurance gate that remains pending in the canonical enterprise closure evidence.

Escalate rather than autonomously publish when a post:

- names a customer, prospect, law firm, security assessor, regulator or partner in a way that implies endorsement or relationship;
- announces pricing, contractual commitments, fundraising, acquisition, litigation, a security incident or an assurance result not already canonical and public;
- contains a factual claim that cannot be reconciled with repository/production evidence.

Email authorization remains a separate policy. LinkedIn publishing permission does not authorize sending email.

## Recommended editorial lanes

- EU AI Act education for decision makers
- AI governance and risk operations
- Enterprise trust / security architecture using verified facts only
- Procurement and evidence readiness
- Product workflows and use cases
- Founder/company progress where disclosure is appropriate

## Rollout states

- `CODE_READY`: publisher, queue, worker and scheduler code are merged and CI is green.
- `QUEUE_READY`: queue migration is applied and worker access is validated. **Verified true in Production on 2026-09-02.**
- `OAUTH_READY`: LinkedIn app/API access and required scopes are approved/configured.
- `CONNECTED`: server-side credentials are configured and the protected connection verifier reports `readyForControlledTest=true`.
- `TEST_POST_PASS`: controlled organization post succeeds and is manually verified.
- `MARKETING_OPERATOR_ACTIVE`: recurring editorial scheduling under the high-autonomy policy is enabled.

Do not mark `CONNECTED` or later states without live production evidence.
