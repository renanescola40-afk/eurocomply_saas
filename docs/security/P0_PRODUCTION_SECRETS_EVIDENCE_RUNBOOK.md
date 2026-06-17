# P0 Production Secrets Evidence Runbook

This runbook closes the `production-secrets-provider-stores` P0 runtime evidence item only after real provider-side configuration is reviewed.

## Scope

Evidence must prove that production secrets are configured in provider secret stores and are not committed to the repository.

Minimum provider scope for EuroComply:

- GitHub Actions or GitHub Environments secrets and variables
- Vercel project environment variables for Production
- Supabase project secrets, API keys, auth/database settings, and service role handling
- Stripe live-mode secrets and webhook signing secrets, if payments are enabled
- Upstash Redis REST credentials, if queue/cache/rate-limit features are enabled
- Any email, analytics, storage, monitoring, or error-reporting provider used in production

## Evidence rules

Do not commit screenshots or exports containing secret values.

Allowed evidence examples:

- Redacted screenshots showing provider name, project/environment, secret variable names, and last updated metadata
- Provider export with values removed or replaced by `[REDACTED]`
- Release approval comment linking to private evidence storage
- Issue created from the P0 Runtime Evidence template with redacted attachments

Required reviewer confirmations:

- Production secrets are stored in provider secret stores, not in repository files
- Production and preview/development environments are separated where the provider supports it
- Secret values are not present in screenshots, comments, logs, issue text, or committed files
- Rotation owner and next review date are documented
- Missing optional providers are explicitly marked `not_applicable` with rationale

## Fill the JSON evidence file

Copy `docs/security/evidence/templates/production-secrets-provider-stores.template.json` to:

```text
docs/security/evidence/runtime/production-secrets-provider-stores.json
```

Then replace every placeholder with real reviewed evidence.

The file is only valid when:

- `status` is `Complete` or `Exception`
- `redactionConfirmation` exactly equals `All secrets, tokens, credentials, connection strings, and access-granting values are redacted.`
- Every required provider has a non-placeholder review entry
- Evidence locations point to durable GitHub issue comments, PR comments, release approval notes, or private evidence storage references

## Go/no-go

Do not mark this P0 item as `Complete` until the provider-side settings have been reviewed in the actual production providers.

If production providers are not fully configured, use `Exception` only for a documented private beta exception with owner, rationale, expiry date, compensating controls, and approval reference.
