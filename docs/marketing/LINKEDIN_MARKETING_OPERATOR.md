# RISCK COMPLY — LinkedIn Marketing Operator

## Objective

Connect RISCK COMPLY to LinkedIn using the official LinkedIn Community Management / Posts API so the approved RISCK COMPLY Marketing Operator can schedule and publish organization posts, then read organization social activity for performance analysis, without exposing credentials to the browser or repository.

## Security model

- `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` remain server-only deployment configuration.
- The runtime can use an existing `LINKEDIN_ACCESS_TOKEN` environment secret as a backward-compatible bootstrap/fallback.
- The managed OAuth path stores rotating access/refresh tokens in Supabase Vault through service-role-only RPCs; browser roles have no execution grant on those RPCs.
- No LinkedIn token or client secret may be committed to Git, placed in GitHub comments, emitted in API responses or pasted into chat.
- OAuth initiation is `/api/platform/marketing/linkedin/oauth/start` and requires an authenticated platform actor with `security` capability, AAL2 MFA and fail-closed rate limiting.
- OAuth callback is `/api/platform/marketing/linkedin/oauth/callback`; it requires the same platform authority, constant-time state verification and required-scope introspection before any token is persisted.
- OAuth state is a cryptographically random value stored only in a `__Host-` HttpOnly/Secure/SameSite=Lax cookie with a 10-minute lifetime.
- Controlled one-off test publishing goes through `/api/internal/marketing/linkedin/publish`.
- Recurring publishing goes through the persistent `linkedin_marketing_posts` queue and `/api/internal/marketing/linkedin/process`.
- Connection readiness is inspected through `/api/platform/marketing/linkedin/status`.
- The connection status endpoint requires an authenticated platform actor with the `security` capability and a current AAL2 MFA session.
- The connection status route is protected by distributed fail-closed rate limiting before LinkedIn provider calls.
- The status endpoint never returns access-token, refresh-token, client-secret or resolved organization-URN values. It returns configuration booleans, credential source (`environment` or `vault`), token activity/expiry/scopes, organization-resolution state and a non-mutating organization read-probe result only.
- Internal publishing routes use the existing internal authentication, fail-closed rate-limit and no-store controls.
- The queue has RLS enabled and browser roles receive no direct table privileges.
- Due posts are claimed atomically with `FOR UPDATE SKIP LOCKED` before provider publication.
- A network-uncertain LinkedIn **publish** outcome is moved to `needs_review` and is never automatically retried, preventing accidental duplicate posts.
- Organization lookup failures occur before a publish request and are classified as deterministic `failed`, not as an uncertain publish outcome.
- LinkedIn API failures are sanitized before returning to callers and provider response bodies are not propagated.
- `LINKEDIN_API_VERSION` is explicit configuration rather than a hardcoded permanently-valid API version.

## Required LinkedIn authorization

For the intended marketing operation, request only the organization-social permissions needed for the current scope:

- `w_organization_social` — publish/manage organization social content;
- `r_organization_social` — read organization social content for verification and performance analysis.

The authenticated LinkedIn member must have an eligible role on the RISCK COMPLY LinkedIn Page and the LinkedIn Developer application must have approved Community Management API access for those scopes.

LinkedIn Marketing APIs use 3-legged OAuth member authorization. Do not substitute a client-credentials flow for this integration.

The official authorization-code endpoints are:

- `https://www.linkedin.com/oauth/v2/authorization`
- `https://www.linkedin.com/oauth/v2/accessToken`

The canonical RISCK COMPLY callback is:

```text
https://www.risckcomply.com/api/platform/marketing/linkedin/oauth/callback
```

An explicit server-side `LINKEDIN_OAUTH_REDIRECT_URI` may override that default for an approved environment, but the value must exactly match the redirect URI registered in the LinkedIn Developer application.

The official Posts API is used at `https://api.linkedin.com/rest/posts` with:

- `Authorization: Bearer ...`
- `LinkedIn-Version: YYYYMM`
- `X-Restli-Protocol-Version: 2.0.0`

The connection verifier also uses LinkedIn's official OAuth token introspection endpoint, the Organization Lookup API and a read-only Posts API finder request.

## OAuth token persistence

The managed OAuth path uses Supabase Vault rather than a plaintext application table.

Migration `20260903110000_linkedin_oauth_vault_bridge.sql` creates only three bounded `public` RPC bridges:

- `read_linkedin_marketing_secret(text)`;
- `store_linkedin_marketing_secret(text,text,text)`;
- `delete_linkedin_marketing_secret(text)`.

The RPCs are `SECURITY DEFINER`, use a bounded `search_path`, accept only the canonical LinkedIn access/refresh secret names, revoke execution from `PUBLIC`, `anon` and `authenticated`, and grant execution only to `service_role`.

Runtime precedence is:

1. valid server-side `LINKEDIN_ACCESS_TOKEN` environment value, when deliberately configured;
2. Vault secret `linkedin_marketing_access_token`.

This preserves current production compatibility while allowing the OAuth-managed credential to take over after the Vault bridge is promoted. If the Vault RPC is not yet present, the credential reader treats the bridge as unavailable rather than crashing unrelated runtime paths. Other Vault/database failures remain fail-closed.

When LinkedIn returns a refresh token, it is stored separately as `linkedin_marketing_refresh_token`. When a later authorization does **not** return a refresh token, any stale refresh token is deleted. Automatic refresh is not enabled merely because a value exists; it remains a separate gate until LinkedIn actually grants refresh-token capability to the RISCK COMPLY application.

## Organization resolution

RISCK COMPLY no longer requires a human to discover the numeric LinkedIn Organization ID before connection testing.

Resolution order is fail-closed:

1. an explicit organization URN supplied internally for a controlled call;
2. optional server-side `LINKEDIN_ORGANIZATION_URN` override;
3. official LinkedIn Organization Lookup by vanity name.

The canonical default vanity name is `risck-comply`, matching the public Company Page URL. It may be overridden server-side with `LINKEDIN_ORGANIZATION_VANITY_NAME` if the Page vanity name changes.

The lookup result is accepted only when:

- the returned `vanityName` exactly matches the expected value after normalization;
- the returned `id` is a positive safe integer;
- the resulting author is constructed as `urn:li:organization:<id>`.

If lookup is unavailable, rejected, malformed or mismatched, publishing is not attempted.

## Community Management access tiers

RISCK COMPLY uses a conservative rollout aligned to LinkedIn's current program-tier description:

- **Development Tier** — integration build/test only. Use it to complete OAuth, verify scopes, exercise the connection verifier and execute bounded test publishing within LinkedIn's restrictions.
- **Standard Tier** — required by RISCK COMPLY before enabling recurring autonomous live production publishing. LinkedIn describes this tier as the live-production tier without Development restrictions.

`MARKETING_OPERATOR_ACTIVE` must not be set merely because Development access works. Standard access is a separate production gate.

## Required production configuration

Required server-side configuration:

```text
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_API_VERSION=<LinkedIn-supported YYYYMM version>
```

Optional bootstrap / override configuration:

```text
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_OAUTH_REDIRECT_URI=https://www.risckcomply.com/api/platform/marketing/linkedin/oauth/callback
LINKEDIN_ORGANIZATION_URN=urn:li:organization:<numeric-id>
LINKEDIN_ORGANIZATION_VANITY_NAME=risck-comply
```

`LINKEDIN_CLIENT_SECRET` and any access/refresh token are secrets. Store them only in an approved server-side deployment secret store or Supabase Vault. Never paste them into source code, GitHub issues/PR comments, logs, browser-visible variables or chat messages.

## First connection and activation procedure

1. Create a LinkedIn Developer application associated with the RISCK COMPLY LinkedIn Page.
2. Apply for Community Management API Development Tier access.
3. Confirm `r_organization_social` and `w_organization_social` are available to the application.
4. Register the exact callback `https://www.risckcomply.com/api/platform/marketing/linkedin/oauth/callback` in the LinkedIn application (or the explicitly approved `LINKEDIN_OAUTH_REDIRECT_URI`).
5. Store `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` only in the production deployment secret store.
6. Set a currently supported `LINKEDIN_API_VERSION`.
7. Ensure the forward-only Vault bridge migration has been promoted through the governed Supabase lane.
8. From an authenticated RISCK COMPLY platform-security session with AAL2 MFA, open `/api/platform/marketing/linkedin/oauth/start`.
9. Complete LinkedIn member consent using an account with an eligible RISCK COMPLY Page role.
10. The callback exchanges the code server-side, verifies the state cookie, introspects the token and rejects the connection unless the required organization scopes are active.
11. The callback stores the access token and, only when supplied by LinkedIn, the refresh token in Supabase Vault. It never returns either token to the browser.
12. Allow the verifier to resolve the canonical `risck-comply` organization automatically; configure `LINKEDIN_ORGANIZATION_URN` only as a deliberate override if needed.
13. Call `/api/platform/marketing/linkedin/status` from an AAL2 platform-security session and require `readyForControlledTest=true`.
14. Execute one controlled organization post permitted by the granted Development-tier conditions.
15. Record the returned LinkedIn post id and verify Page rendering.
16. Confirm the queue worker can claim and publish one intentionally scheduled integration-test item without duplicate behavior.
17. Prepare the Community Management Standard Tier application/evidence required by LinkedIn, including a demonstration/screen recording if requested by the current access process.
18. Obtain Standard Tier approval.
19. Re-run connection verification and a bounded production acceptance test under the granted Standard access.
20. Enable recurring editorial scheduling only after Standard access and the production acceptance gates pass.

## Connection verifier

`GET /api/platform/marketing/linkedin/status` is read-only and returns a structure containing:

- whether each secret/configuration item is configured;
- whether the access token came from the environment or Vault;
- the canonical organization vanity name;
- whether an optional organization-URN override is configured and valid;
- whether LinkedIn token introspection reports the token active;
- token expiry metadata when LinkedIn supplies it;
- granted scope names and whether both required organization-social scopes are present;
- whether organization resolution succeeds and whether it used a configured URN or vanity lookup;
- whether a non-mutating Posts API read for the resolved organization succeeds;
- `readyForControlledTest`, which is true only when the live connection gates above pass.

The endpoint does not publish, modify or delete LinkedIn content and does not return the access token, refresh token or resolved organization URN.

## Token lifecycle

LinkedIn access tokens are time-limited. The verifier records provider `expires_at` metadata so expiry is an operational gate rather than a surprise failure.

LinkedIn may return `refresh_token` and `refresh_token_expires_in` when the granted program supports that capability. RISCK COMPLY stores those values securely if present but does **not** assume programmatic refresh support. If refresh tokens are not available, re-trigger controlled 3-legged OAuth before access-token expiry. If refresh tokens are granted, a separate reviewed rotation path must be enabled before claiming unattended long-term autonomy.

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

Owner intent for this integration is **high marketing autonomy** after the connection and production-tier gates below pass. The operator may create an editorial plan, draft final copy, schedule posts and publish scheduled content without per-post approval when the content remains inside this policy.

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
- `OAUTH_VAULT_CODE_READY`: OAuth start/callback, Vault credential provider and service-role bridge are merged and CI is green.
- `OAUTH_VAULT_RUNTIME_READY`: Vault bridge migration is promoted and the OAuth callback can persist credentials without an environment access token.
- `DEVELOPMENT_ACCESS_READY`: Community Management Development Tier is approved and required scopes are available.
- `CONNECTED`: server-side credentials are configured, organization resolution succeeds and the protected connection verifier reports `readyForControlledTest=true`.
- `DEVELOPMENT_TEST_PASS`: controlled integration post and queue test succeed under the granted Development conditions.
- `STANDARD_ACCESS_READY`: Community Management Standard Tier is approved for the live production use case.
- `PRODUCTION_ACCEPTANCE_PASS`: the Standard-tier connection and bounded production test are verified.
- `MARKETING_OPERATOR_ACTIVE`: recurring editorial scheduling under the high-autonomy policy is enabled.

Do not mark `MARKETING_OPERATOR_ACTIVE` without `STANDARD_ACCESS_READY` and `PRODUCTION_ACCEPTANCE_PASS`.

## Migration-order safety

The OAuth Vault bridge is intentionally versioned `20260903110000`, after the currently prepared Enterprise Step-Up V29 migration lane. It must not be promoted ahead of an earlier pending production migration. The OAuth implementation PR should remain blocked/draft until the governed migration order is reconciled.
