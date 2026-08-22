# RISCK COMPLY transactional email with Resend

This runbook covers onboarding, billing and operational alert email delivery through Resend using a verified RISCK COMPLY domain.

## Scope

Transactional email templates covered:

- `welcome_onboarding`
- `organization_created`
- `member_invited`
- `billing_started`
- `invoice_failed`
- `compliance_deadline_reminder`
- `export_ready`
- `security_alert`

Legacy operational templates are also supported: `trial_upgrade`, `document_expiring`, `vendor_review`.

## Required environment variables

Configure these in Vercel production/preview and never commit real values:

```bash
RESEND_API_KEY=
EMAIL_FROM="RISCK COMPLY <no-reply@risckcomply.app>"
SUPPORT_EMAIL=support@risckcomply.app
EMAIL_REPLY_TO=support@risckcomply.app
EMAIL_MAX_SEND_ATTEMPTS=3
EMAIL_LOG_HASH_PEPPER=
REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY=false
```

`EMAIL_LOG_HASH_PEPPER` should be a random server-side secret used to hash recipients in `email_delivery_logs`. If omitted, the app falls back to `AUDIT_CHAIN_SIGNING_SECRET` and then a non-production default.

`REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY` is an operational readiness guard. Local and preview environments may leave it `false`. The protected Production deployment workflow sets it to `true`, requires both `RESEND_API_KEY` and `EMAIL_FROM`, synchronizes the binding names to Vercel Production without printing values, and causes `/api/ready` to fail closed if the required pair is absent.

This configuration-level readiness proof does **not** prove that the sending domain is verified, that a message has been delivered, or that provider account/DPA/region/retention facts have been accepted. Those remain separate provider/runtime evidence.

## Resend setup

1. Create or open the Resend project for RISCK COMPLY.
2. Add the sending domain, for example `risckcomply.app`.
3. Use a dedicated transactional sender such as `no-reply@risckcomply.app`.
4. Add the DNS records Resend gives you.
5. Wait until Resend shows the domain as verified.
6. Add the `RESEND_API_KEY` to the protected Production provider store and configure `EMAIL_FROM` as the reviewed sender variable.
7. Deploy through the protected Production workflow so the Resend key, sender and readiness guard are synchronized to Vercel Production.
8. Only after authorized deployment, run protected delivery tests when a real delivery proof is required.

## DNS records

Use the exact values shown by Resend for DKIM and SPF. The examples below show the intended shape only.

### SPF

If the root domain does not already have SPF:

```txt
Type: TXT
Host/Name: @
Value: v=spf1 include:amazonses.com ~all
```

If SPF already exists, merge `include:amazonses.com` into the existing single SPF record. Do not create multiple SPF TXT records for the same host.

### DKIM

Resend normally provides three CNAME records. Add every DKIM CNAME exactly as shown in Resend.

```txt
Type: CNAME
Host/Name: <resend-selector>._domainkey
Value: <resend-value>.dkim.amazonses.com
```

### DMARC

Start with monitoring, then tighten after Gmail/Outlook pass:

```txt
Type: TXT
Host/Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@risckcomply.app; ruf=mailto:dmarc@risckcomply.app; adkim=s; aspf=s; fo=1
```

After 7-14 days of clean reports, move to quarantine:

```txt
v=DMARC1; p=quarantine; pct=25; rua=mailto:dmarc@risckcomply.app; adkim=s; aspf=s
```

After stable production traffic, move to reject:

```txt
v=DMARC1; p=reject; rua=mailto:dmarc@risckcomply.app; adkim=s; aspf=s
```

## Database migration

Run this migration in Supabase:

```txt
supabase/migrations/20260626190000_transactional_email_delivery.sql
```

It creates `email_delivery_logs` with:

- recipient
- recipient hash
- template
- status
- provider
- provider id
- attempts
- sanitized error
- organization/user references
- metadata

The email body is intentionally not stored.

## Sending architecture

`src/lib/email/server-sender.ts` sends through Resend using `fetch` and implements:

- server-only execution
- configurable retries with exponential backoff and jitter
- provider id capture
- idempotency key forwarding to Resend
- delivery logs in Supabase
- sensitive token redaction/blocking before send
- optional List-Unsubscribe headers when a template passes `unsubscribeUrl`

## Readiness and deployment contract

The protected Production deploy is the authority for enabling transactional-email readiness:

- `REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY=true` is forced by the workflow rather than copied from an untrusted runtime value;
- `RESEND_API_KEY` must exist in the protected Production secret store;
- `EMAIL_FROM` must exist in the protected Production variable store;
- the API key is synchronized to Vercel as sensitive;
- the sender and readiness guard are synchronized without exposing them to browser code;
- `/api/ready` returns only boolean configuration state and returns `503 not_ready` when the protected guard is active but either required binding is absent;
- readiness performs no network call and sends no email.

A green configuration readiness check is therefore evidence of the required binding names being present for the runtime, not evidence of successful inbox delivery or domain authentication.

## Sensitive data rule

Email subject, HTML, text and unsubscribe URL are scanned before send. Delivery is blocked if token-like values are detected, including:

- Stripe/Resend/Clerk-style secrets
- bearer tokens
- JWT-like values
- query parameters such as `token=`, `secret=`, `api_key=`, `password=`, `otp=`, `code=`

Do not place API keys, OTPs, password reset tokens, raw invite tokens, session IDs or webhook secrets in email content or logs.

## Test endpoint

A protected internal endpoint can send test templates:

```bash
curl -X POST "$NEXT_PUBLIC_APP_URL/api/internal/email/test" \
  -H "Authorization: Bearer $INTERNAL_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"to":"you@gmail.com","template":"welcome_onboarding","organizationName":"RISCK COMPLY"}'
```

Repeat for Outlook:

```bash
curl -X POST "$NEXT_PUBLIC_APP_URL/api/internal/email/test" \
  -H "Authorization: Bearer $INTERNAL_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"to":"you@outlook.com","template":"member_invited","organizationName":"RISCK COMPLY"}'
```

Recommended acceptance test templates:

- Gmail: `welcome_onboarding`, `member_invited`, `billing_started`
- Outlook: `welcome_onboarding`, `member_invited`, `invoice_failed`
- Compliance: `compliance_deadline_reminder` and check `List-Unsubscribe`
- Security: `security_alert` and verify it contains no secrets

## Gmail/Outlook inbox checklist

For every test message:

- The email lands in Primary/Focused Inbox or Updates, not Spam/Junk.
- SPF passes.
- DKIM passes.
- DMARC passes and aligns with the visible From domain.
- The visible From is `RISCK COMPLY <no-reply@risckcomply.app>`.
- No raw token or secret appears in subject/body.
- The CTA opens an authenticated app page.
- `email_delivery_logs` contains status `sent` and the Resend provider id.

## Spam prevention notes

No system can guarantee that a domain never lands in spam. The production requirement should be interpreted as: domain authenticated, reputation warmed, Gmail/Outlook tests passing, and no obvious spam triggers. For a new domain, ramp volume gradually and keep bounce/complaint rates low.

## Acceptance criteria mapping

- Protected binding: the Production workflow requires/synchronizes `RESEND_API_KEY`, `EMAIL_FROM` and `REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY=true` and `/api/ready` fails closed when the required pair is absent.
- Domain verified: Resend domain status must show verified after DNS setup.
- Welcome email sent: send `welcome_onboarding` through the test endpoint.
- Invite email sent: send `member_invited` through the test endpoint or product invite flow.
- Billing email sent: send `billing_started` through the test endpoint and Stripe billing flow.
- Logs exist: query `email_delivery_logs` for template/status/provider_id.
- No sensitive data: blocked by `assertNoSensitiveContent` and no body storage in logs.
