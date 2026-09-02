# RISCK COMPLY — LinkedIn Marketing Operator

## Objective

Connect RISCK COMPLY to LinkedIn using the official LinkedIn Marketing / Posts API so the approved RISCK COMPLY Marketing Operator can schedule and publish organization posts without exposing credentials to the browser or repository.

## Security model

- Credentials are server-only environment variables.
- No LinkedIn token or client secret may be committed to Git.
- Controlled one-off test publishing goes through `/api/internal/marketing/linkedin/publish`.
- Recurring publishing goes through the persistent `linkedin_marketing_posts` queue and `/api/internal/marketing/linkedin/process`.
- Internal publishing routes use the existing internal authentication, fail-closed rate-limit and no-store controls.
- The queue has RLS enabled and browser roles receive no direct table privileges.
- Due posts are claimed atomically with `FOR UPDATE SKIP LOCKED` before provider publication.
- A network-uncertain LinkedIn outcome is moved to `needs_review` and is never automatically retried, preventing accidental duplicate posts.
- LinkedIn API failures are sanitized before returning to callers and sent to the existing observability path without provider response bodies.
- `LINKEDIN_API_VERSION` is explicit configuration rather than a hardcoded permanently-valid API version.

## Required LinkedIn authorization

For organization publishing, the authenticated LinkedIn member must have an eligible role on the RISCK COMPLY LinkedIn Page and the LinkedIn application must receive the `w_organization_social` permission.

The official Posts API is used at `https://api.linkedin.com/rest/posts` with:

- `Authorization: Bearer ...`
- `LinkedIn-Version: YYYYMM`
- `X-Restli-Protocol-Version: 2.0.0`

## Required production environment variables

```text
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_ORGANIZATION_URN=urn:li:organization:<numeric-id>
LINKEDIN_API_VERSION=<LinkedIn-supported YYYYMM version>
```

The access token must be obtained through LinkedIn OAuth. Never paste the LinkedIn client secret into source code, issues, PR comments, logs, or client-side environment variables.

## First connection procedure

1. Create or select the LinkedIn Developer application owned by the business/operator responsible for RISCK COMPLY.
2. Associate/verify the RISCK COMPLY LinkedIn Page where required by LinkedIn.
3. Request/enable the LinkedIn product/API access that grants `w_organization_social`.
4. Configure the production OAuth redirect URI on the LinkedIn application.
5. Complete the LinkedIn member authorization flow using an account with an eligible Page role.
6. Store the resulting production credential only in the deployment secret store.
7. Resolve the RISCK COMPLY Page numeric organization id and configure `LINKEDIN_ORGANIZATION_URN`.
8. Set a currently supported `LINKEDIN_API_VERSION`.
9. Execute one controlled test post through the protected one-off publisher.
10. Record the returned LinkedIn post id and verify the Page rendering.
11. Enable the queue migration and confirm the queue worker can claim an intentionally scheduled test item.
12. Enable recurring editorial scheduling only after the test post and worker evidence pass.

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
- `QUEUE_READY`: queue migration is applied and worker access is validated.
- `OAUTH_READY`: LinkedIn app and permission are approved/configured.
- `CONNECTED`: production access token + organization URN + API version are configured.
- `TEST_POST_PASS`: controlled organization post succeeds and is manually verified.
- `MARKETING_OPERATOR_ACTIVE`: recurring editorial scheduling under the high-autonomy policy is enabled.

Do not mark `QUEUE_READY`, `CONNECTED` or later states without live production evidence.
