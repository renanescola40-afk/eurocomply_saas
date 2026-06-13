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

Accepted evidence:

- Migration deployment record
- Verification endpoint output
- Test run output
- Manual concurrency validation note

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
- Webhook signing is configured
- Subscription state changes are reflected in the app

Accepted evidence:

- Stripe test event logs
- Webhook delivery logs
- Checkout session evidence
- Billing portal evidence

## Observability evidence

Attach evidence for:

- Error reporting is configured
- Production logs are accessible to the release owner
- Security-sensitive failures are observable without leaking secrets
- Rollback procedure is known and tested or documented

Accepted evidence:

- Monitoring dashboard link or screenshot
- Error reporting test event
- Logging access confirmation
- Rollback runbook reference

## External review evidence

For public production or enterprise procurement, attach evidence for:

- External security review or pentest completed
- Critical findings resolved
- High findings resolved or formally accepted
- Retest evidence attached where applicable

Accepted evidence:

- Pentest report
- Finding triage spreadsheet
- Retest confirmation
- Risk acceptance sign-off

## Release decision

A release may be promoted only when every required evidence section is either:

- Complete
- Not applicable to the target release tier
- Explicitly accepted as a documented risk by the release owner

Private beta may accept more documented exceptions.

Public production should not accept exceptions for build, CI, RLS, audit-chain integrity, or billing correctness.

Enterprise procurement should not accept exceptions for supply-chain triage, live RLS validation, step-up authentication, upload scanning policy, audit-chain integrity, or external review.
