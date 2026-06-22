# Release Evidence Checklist

This checklist defines the evidence package that must be attached to a EuroComply release before promoting it beyond private beta.

It complements `docs/RELEASE_CANDIDATE_VALIDATION.md` by focusing on artifacts that cannot be proven by static source checks alone.

## Release identity

For every release candidate, record:

- Release version or tag
- Commit SHA
- Deployment target
- Deployment URL
- Release owner
- Approval date
- Rollback owner
- Customer communication owner

## Build and CI evidence

Attach evidence for:

- Security CI completed successfully
- Production build completed successfully
- Vercel deployment completed successfully
- No required security gate was skipped
- Any failed run was triaged and rerun successfully

Accepted evidence:

- CI run URL or exported logs
- Vercel deployment URL
- Build output summary
- Release approval note

## Production environment evidence

Attach evidence for:

- `.env.example` matches the variables required by the release candidate
- Production environment variables are configured in Vercel or the target hosting provider
- Secret values are stored only in the provider secret store, not in source control
- `AUDIT_CHAIN_SIGNING_SECRET` is configured before enabling audit-chain verification evidence
- `EVIDENCE_PACK_SIGNING_SECRET` is configured before sharing Audit Evidence Packs externally
- `HEALTHCHECK_TOKEN`, `CRON_SECRET`, and `INTERNAL_CRON_SECRET` are configured for protected operational routes
- `SUPABASE_SERVICE_ROLE_KEY` is configured only as a server-side secret
- Stripe, Resend, Upstash, and Sentry environment variables are set only when those services are enabled for the target release tier

Accepted evidence:

- Hosting-provider environment variable screenshot or export with values redacted
- Release owner confirmation that all secrets are provider-managed
- `.env.example` policy check output
- Audit-chain signing smoke-test output
- Evidence Pack signing smoke-test output

## Supply-chain evidence

Attach evidence for:

- Lockfile exists for the release candidate
- Install command uses deterministic dependency resolution
- Dependency audit output was generated
- Audit findings were triaged
- Any accepted vulnerability has owner, severity, rationale, and due date

Accepted evidence:

- Committed lockfile
- Audit report artifact
- Audit triage notes
- Approved exception record

## Supabase and RLS evidence

Attach evidence for:

- Live RLS validation completed against the target Supabase project
- Critical tenant tables were checked
- No cross-tenant read/write path was found
- Service-role paths were reviewed separately from user-session paths

Accepted evidence:

- RLS validation output
- Supabase project identifier
- Screenshot or log excerpt showing validation success
- Manual review note for critical tables

## Audit-chain evidence

Attach evidence for:

- Hash-chain schema migration has been applied
- Transactional append RPC migration has been applied
- Audit-chain verification endpoint works on target environment
- Concurrency behavior is covered by tests or manual validation
- Signing status is recorded, including whether `AUDIT_CHAIN_SIGNING_SECRET` is configured

Accepted evidence:

- Migration deployment record
- Verification endpoint output
- Test run output
- Manual concurrency validation note
- Signing configuration note with secret values redacted

## Step-up authentication evidence

Attach evidence for:

- Sensitive exports require step-up verification
- Billing actions require step-up verification
- GDPR delete requests require step-up verification
- Production step-up provider is configured, or release explicitly remains private beta

Accepted evidence:

- Step-up test output
- Provider configuration note
- Manual request/response evidence
- Exception record if provider is not configured

## Upload content scanning evidence

Attach evidence for:

- Upload file type validation is active
- Malware/content scan policy is configured for the target release tier
- Enterprise releases fail closed when scanning is required and unavailable
- Rejected uploads are audited

Accepted evidence:

- Upload security test output
- Configuration note for scanning mode
- Manual rejected-upload evidence
- Audit event excerpt

## Stripe and billing evidence

Attach evidence for:

- Checkout flow works in the target environment
- Billing portal flow works in the target environment
- Webhook signing is configured and invalid signatures fail closed
- Webhook duplicates are idempotent through `public.stripe_events_processed`
- Unsupported Stripe events are ignored without mutating billing state
- Subscription created, updated, and deleted events are reflected in the app
- Stripe `organization_id`, customer, subscription, and plan metadata are validated before local mutation
- Billing actions require `manage_billing`, trusted origin/mutation checks, and step-up verification
- Billing changes produce audit events

Accepted evidence:

- `docs/security/evidence/runtime/stripe-billing-validation.json`
- Stripe test event logs
- Webhook delivery logs
- Checkout session evidence
- Billing portal evidence
- Focused test output for webhook signature, duplicate webhook, subscription sync, invalid plan, missing step-up, and portal permission denial

## Observability evidence

Attach evidence for:

- Error reporting is configured when enabled for the target environment
- Production logs are accessible to the release owner
- Security-sensitive failures are observable without leaking secrets
- Rollback procedure is known and tested or documented
- Any monitoring claim in public pages matches the actual provider configuration

Accepted evidence:

- Monitoring dashboard link or screenshot
- Error reporting test event
- Logging access confirmation
- Rollback runbook reference
- Public claims review note

## Trust Center readiness evidence

Attach evidence for:

- Public Trust Center route is reachable at `/{locale}/trust`
- Public Security route is reachable at `/{locale}/security`
- Footer includes links to Trust Center and Security
- Commercial pages include a Trust Center path for enterprise buyers before a sales call
- `docs/trust/SECURITY_OVERVIEW.md` exists and reflects current implementation
- `docs/trust/ARCHITECTURE_OVERVIEW.md` exists and reflects current architecture
- `docs/trust/DATA_PROTECTION.md` exists and includes retention and deletion posture
- `docs/trust/ACCESS_CONTROL.md` exists and matches the RBAC implementation
- `docs/trust/ENCRYPTION.md` exists and avoids unsupported encryption claims
- `docs/trust/INCIDENT_RESPONSE.md` exists and includes responsible disclosure contact
- `docs/trust/BACKUP_AND_RECOVERY.md` exists and distinguishes plans from tested evidence
- `docs/trust/SUBPROCESSORS.md` exists and lists actual/conditional subprocessors honestly
- `docs/trust/SECURITY_FAQ.md` exists with customer-safe answers
- `docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md` exists with procurement response checklist
- Public and commercial copy does not claim SOC 2, ISO 27001 certification, completed pentest, end-to-end encryption, WORM immutability, 24/7 staffed monitoring, tested disaster recovery, or tested backup restore unless evidence is attached

Accepted evidence:

- `npm run security:trust-package` output
- Route health output for `/trust` and `/security`
- Screenshot or deployment URL for Trust Center and Security pages
- Diff review confirming no compliance-washing claims
- Procurement packet review note from release owner

## Customer communication evidence

Attach evidence for:

- Customer communication owner assigned
- Status page owner assigned or explicit exception recorded
- Support owner assigned
- Support macros or response guidance prepared
- Security/compliance reviewer assigned for security, privacy, audit-chain, RLS, authorization, billing, or data integrity communications
- SEV-1 and SEV-2 communication timing targets acknowledged
- Customer communication plan reviewed before Go/No-Go

Accepted evidence:

- Completed `docs/RELEASE_CUSTOMER_COMMUNICATION_PLAN.md` review note
- Release approval record naming the customer communication owner
- Status page decision
- Support readiness note
- Customer notice draft, if applicable
- Post-incident customer summary decision, if applicable

## External review evidence

For public production or enterprise procurement, attach evidence for:

- External security review or pentest completed, or a clear deferral is disclosed
- Critical findings resolved
- High findings resolved or formally accepted
- Retest evidence attached where applicable

Accepted evidence:

- Pentest report when available
- External review report when available
- Finding triage spreadsheet
- Retest confirmation
- Risk acceptance sign-off
- Customer-safe disclosure if external review has not been completed

## Release decision

A release may be promoted only when every required evidence section is either:

- Complete
- Not applicable to the target release tier
- Explicitly accepted as a documented risk by the release owner

Private beta may accept more documented exceptions.

Public production should not accept exceptions for build, CI, RLS, audit-chain integrity, billing correctness, customer communication ownership, or Trust Center claim accuracy.

Enterprise procurement should not accept exceptions for supply-chain triage, live RLS validation, step-up authentication, upload scanning policy, audit-chain integrity, customer communication readiness, Trust Center readiness, or external review disclosure.
