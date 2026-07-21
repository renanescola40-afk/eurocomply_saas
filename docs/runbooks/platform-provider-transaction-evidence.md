# Platform provider transaction evidence

## Purpose

Validate redacted proof that three controlled production transactions completed for one exact release SHA:

- Supabase Google OAuth callback and authenticated session;
- Stripe test webhook delivery and successful acknowledgement;
- Sentry synthetic error ingestion in the expected project and release.

The workflow validates evidence. It does not initiate these transactions.

## Protected environment

Create or verify:

`production-provider-transaction-proof`

Variable:

- `PROVIDER_EVIDENCE_MAX_AGE_HOURS` — recommended `168`.

Secret:

- `PROVIDER_TRANSACTION_EVIDENCE_JSON` — JSON following `evidence/platform/provider-transactions.example.json`.

## Evidence construction

For every provider transaction:

1. execute the controlled test using a dedicated test identity or synthetic payload;
2. retain the original provider receipt outside the repository;
3. remove names, emails, cookies, authorization data, tokens and customer information;
4. hash the original receipt with SHA-256 and store only `receipt_sha256`;
5. hash any correlation identifier with SHA-256 and store only `correlation_id_hash`;
6. record a short non-sensitive summary and UTC observation time;
7. bind the manifest to the exact deployed 40-character release SHA.

Never commit the completed manifest. Store it only as the protected environment secret.

## Provider acceptance criteria

### Supabase OAuth

- Google sign-in reaches the production callback;
- the intended production origin is used;
- an authenticated session is established;
- no token, cookie, email or user identifier enters evidence.

### Stripe webhook

- use Stripe test mode or an isolated provider-supported test event;
- the expected production webhook receives the event;
- signature verification succeeds;
- the application returns the expected successful acknowledgement;
- do not create a real charge or customer obligation.

### Sentry ingestion

- emit a controlled synthetic error with a unique non-sensitive marker;
- confirm it appears in the expected organization, project, environment and release;
- verify source-map processing separately when applicable;
- do not include user PII in the synthetic event.

## Execution

1. Confirm the manifest `release_sha` equals the current production release.
2. Add the JSON to `PROVIDER_TRANSACTION_EVIDENCE_JSON`.
3. Open **Actions → Platform Provider Transaction Evidence**.
4. provide the same exact SHA;
5. set `strict_runtime=true`;
6. approve the protected environment;
7. retain the generated redacted artifact with release evidence.

## PASS conditions

- exact SHA matches;
- evidence is within the configured freshness window;
- all three required provider transactions report PASS;
- each transaction has valid receipt and correlation SHA-256 digests;
- no forbidden sensitive key is present;
- generated validation artifact reports PASS.

## Boundary

A PASS proves that supplied receipts are fresh, redacted, integrity-addressed and bound to an exact release SHA. The original receipts must still be retained in the approved evidence store for independent verification. This control does not prove continuous availability or every future transaction.
