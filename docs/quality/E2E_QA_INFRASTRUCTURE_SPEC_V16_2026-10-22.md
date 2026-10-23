# Authenticated E2E QA Infrastructure Specification — V16

**Scope:** disposable non-production browser-to-provider acceptance only.  
**Status:** `NOT_READY`; no authenticated E2E was executed.  
**Production use:** forbidden for synthetic writes.

## Required Components

| Component | Required configuration | Current evidence |
| --- | --- | --- |
| Application | HTTPS QA origin bound to the exact tested commit; no production aliases, inherited production credentials, or customer data. A Codespaces forwarded HTTPS origin is the preferred zero-incremental-cost app target for a local Next server. | `MISSING`; no `E2E_QA_BASE_URL` or `E2E_BASE_URL` in this Codespace. Existing Vercel Preview variable values were not verified; do not deploy there until every effective binding is proven QA-only. |
| Database/Auth | Dedicated Supabase project `zrxrrfbllsxtleyxjpsz`, `eu-west-1`, PostgreSQL 17.11, previously observed `ACTIVE_HEALTHY`, 0 public tables and 0 migrations. Apply only a separately validated schema-only manifest; never copy production data. | Project exists under a previous 0/month quote; schema is empty. Current database credentials and URL are not available in this Codespace. The migration replay candidate remains `CANDIDATE_NOT_EXECUTABLE`. |
| Stripe | Stripe TEST secret and webhook signing secret dedicated to this QA target; verify checkout/webhook endpoint binds the exact QA app and test workspace. Never use LIVE keys or enable an old endpoint. | `MISSING`; no Stripe TEST bindings in this Codespace. |
| Mail | Local Mailpit/MailHog or another verified sink that accepts only synthetic messages and cannot relay to real recipients. Set the QA confirmation flag only after proving delivery stays in the sink. | `MISSING`; no mail-sink attestation. No email was sent. |
| Test users | Disposable QA owner and member accounts created only after the isolated schema/Auth project is ready; MFA factor and paid-business test entitlement must belong to synthetic tenants. | `MISSING`; no QA test-user credentials or storage state in this Codespace. |

## Cost Boundary

```text
NEW_PROVIDER_SPEND=NOT_AUTHORIZED
SUPABASE_QA_PROJECT_QUOTE=0/month (historical point-in-time provider quote; not a current billing guarantee)
VERCEL_PREVIEW_COST=UNVERIFIED; do not use until plan/usage is checked
CIRCLECI_CREDIT_COST=UNVERIFIED; do not trigger full validation until included quota is confirmed
SAFE_ZERO_COST_OPTION=Codespaces forwarded HTTPS Next.js app + existing dedicated QA Supabase project + Stripe TEST + local non-relaying Mailpit; use only after QA-only credentials are provisioned through protected stores and the schema is independently validated.
```

The zero-cost option is a specification, not evidence that any missing credential or provider binding is configured. It must fail closed if production aliases, LIVE billing credentials, unverified database refs, or mail relay are detected.

## First Acceptance Journey

After all components are available, run only a synthetic owner journey first:

```text
BROWSER → AUTH → API → QA DATABASE → PERSISTENCE → RELOAD → AUDIT EVENT
```

Use one isolated test workspace, create one synthetic AI-system record through the application API, assert the database row and audit event, reload the browser and confirm both persist. Then test member denial and a second synthetic tenant. The test report must bind the exact source SHA and application origin, with zero skipped/flaky tests. This does not prove legal acceptance, production isolation, Stripe lifecycle or full Enterprise 100 closure.

## Stop Conditions

- Missing or mismatched approved Supabase project ref.
- Any production origin, production Supabase project, Stripe LIVE credential or mail relay.
- Any unverified Vercel Preview environment inheritance.
- Any schema replay item without production-ledger provenance, source fingerprint, ordering and isolated postcondition evidence.
- Any provider operation with an unknown charge or non-disposable data risk.

No provider was activated, no data was written, and no customer or external party was contacted while preparing this specification.