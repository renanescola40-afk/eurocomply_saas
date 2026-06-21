# RISCK COMPLY Legal Readiness

This document tracks the legal and trust materials required before a broad public launch.

## Public legal pages required

The public website should expose localized legal pages for:

- Terms of Service
- Privacy Policy
- Data Processing Addendum
- Subprocessors
- Security Overview
- Contact / Legal Requests

## Production legal checklist

Before accepting production customers, confirm:

- The Privacy Policy names the controller, contact address, processing purposes, retention periods, rights and complaint channels.
- The DPA defines RISCK COMPLY as processor where customers upload third-party or employee data.
- Subprocessors include at minimum Vercel, Supabase, Stripe and Sentry when enabled.
- Stripe billing terms match the product pricing page.
- GDPR export and deletion workflows are operational and audited.
- Organization isolation is enforced through RLS and server-side organization checks.
- Storage buckets are private and restricted by organization path.
- Incident response and breach notification procedure are documented.

## Recommended launch stance

RISCK COMPLY can launch as a controlled beta with legal pages marked as production drafts reviewed by counsel. For enterprise procurement, these documents should be reviewed by a European technology/privacy lawyer before signing regulated customers.
