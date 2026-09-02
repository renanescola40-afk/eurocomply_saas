# RISCK COMPLY — LinkedIn Marketing Operator

## Objective

Connect RISCK COMPLY to LinkedIn using the official LinkedIn Marketing / Posts API so approved automation can publish organization posts without exposing credentials to the browser or repository.

## Security model

- Credentials are server-only environment variables.
- No LinkedIn token or client secret may be committed to Git.
- Publishing goes through `/api/internal/marketing/linkedin/publish`.
- The publishing route uses the existing internal authentication and rate-limit controls.
- LinkedIn API failures are sanitized before returning to callers and sent to the existing observability path.
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

The access token must be obtained through LinkedIn OAuth. Never paste the LinkedIn client secret into source code, issues, PR comments, public chat, logs, or client-side environment variables.

## First connection procedure

1. Create or select the LinkedIn Developer application owned by the business/operator responsible for RISCK COMPLY.
2. Associate/verify the RISCK COMPLY LinkedIn Page where required by LinkedIn.
3. Request/enable the LinkedIn product/API access that grants `w_organization_social`.
4. Configure the production OAuth redirect URI on the LinkedIn application.
5. Complete the LinkedIn member authorization flow using an account with an eligible Page role.
6. Store the resulting production credential only in the deployment secret store.
7. Resolve the RISCK COMPLY Page numeric organization id and configure `LINKEDIN_ORGANIZATION_URN`.
8. Set a currently supported `LINKEDIN_API_VERSION`.
9. Execute a controlled test post through the protected internal publisher.
10. Record the returned LinkedIn post id and verify the Page rendering before enabling any recurring publication workflow.

## Publishing request

The internal publisher accepts:

```json
{
  "text": "Post text"
}
```

A valid request returns HTTP 201 with the LinkedIn post id when LinkedIn exposes it in `x-restli-id`.

## Operator policy

Default marketing autonomy can be high, but factual assertions must remain evidence-backed.

Never publish claims that RISCK COMPLY:

- has a customer, partner, certification, legal approval, regulatory approval, pentest result, security status, market result, funding event, or enterprise customer unless that fact is verified;
- guarantees EU AI Act compliance;
- replaces legal counsel or promises a legal outcome;
- has completed an assurance gate that remains pending in the canonical enterprise closure evidence.

Email authorization remains a separate policy. LinkedIn publishing permission does not authorize sending email.

## Recommended editorial lanes

- EU AI Act education for decision makers
- AI governance and risk operations
- Enterprise trust / security architecture using verified facts only
- Procurement and evidence readiness
- Product workflows and use cases
- Founder/company progress where disclosure is appropriate

## Rollout states

- `CODE_READY`: publisher code is merged and CI is green.
- `OAUTH_READY`: LinkedIn app and permission are approved/configured.
- `CONNECTED`: production access token + organization URN + API version are configured.
- `TEST_POST_PASS`: controlled organization post succeeds and is manually verified.
- `MARKETING_OPERATOR_ACTIVE`: recurring/editorial publishing policy is enabled.

Do not mark `CONNECTED` or later states without live LinkedIn evidence.
