# P0 Runtime Evidence Register

This register separates repository readiness from real production/security execution evidence. It records observed evidence only and keeps the release decision at No-Go while required live evidence remains open or under exception.

## Current release assessment

- Release name: EuroComply Final Enterprise Release Decision - 2026-06-24
- Assessment date: 2026-06-24
- Repository: `renanescola40-afk/eurocomply_saas`
- Latest assessed PR: #431
- PR #431 head SHA: `a52abc7f2b7b1eef41f2d8ab79ed5fdc7ef48a2c`
- PR #431 merge commit SHA: `bcb694b6f9a93d8ae59db742429f00dbb41b369b`
- PR #431 preview deployment: Vercel Ready preview observed.
- PR #431 preview URL functional verification: **Open** until a network-capable release runner verifies `/api/health`, protected `/api/ready`, preview smoke, and production smoke.
- Final validation bundle: `scripts/release/run-final-validation.mjs` exists and includes the requested command chain.
- Final validation result: **Not proven passed** for the assessed commit.
- CI result: Success observed for PR #431 head SHA via CI and Full Security Suite workflows.
- P0 Runtime Evidence workflow result: Success observed for register/file hygiene checks.
- P0 Final Release Gate result: **Not proven for PR #431 / final assessed SHA**.
- Final decision: **No-Go**
- Decision report: `docs/RELEASE_FINAL_READINESS_REPORT.md`

## Evidence status

| Evidence item | Status | Required evidence | Owner | Next action |
| --- | --- | --- | --- | --- |
| Branch protection applied on `main` | Exception | Repository evidence exists; release owner must re-confirm current rules before Go | Release owner | Revalidate for final release commit |
| Required status checks configured | Exception | Repository evidence exists; release owner must confirm final assessed commit checks before Go | Release owner | Revalidate for final release commit |
| CI run for assessed commit | Complete | CI run `28134792863` and Full Security Suite run `28134792914` completed success for PR #431 head SHA | Engineering owner | Attach final command bundle before Go |
| Current PR production deployment / build log | Complete for deployment presence only | Vercel Ready preview and build log observed for PR #431 | Platform owner | Functional smoke verification still required |
| Deployment URL functional verification | Open | Verify the current deployment URL and `/api/health`, protected `/api/ready`, preview smoke and production smoke from a network-capable release runner | Platform owner | Required before Go |
| Final validation runner | Open | `node scripts/release/run-final-validation.mjs` must pass and attach summary/logs for all requested commands | Release owner | Required before Go |
| Production secrets configured in provider secret stores | Complete | `production-secrets-provider-stores.json` records status Complete, provider stores checked, values redacted, reviewer and timestamp | Release owner | Attach runtime preflight before Go |
| Supabase live RLS validation completed | Open | `supabase-live-rls-validation.json` must record status Complete, outcome passed, and tenant A/B isolation proof from the live script | Security reviewer | Required before production/enterprise Go |
| External security review completed | Open | `external-security-review-or-pentest.json` remains Open until a real external report or approved external review exists | Security reviewer | Required before enterprise/procurement |
| Deterministic npm lockfile committed | Complete | `package-lock.json` committed with npm lockfile version 3; attach exact final runner `npm ci` output before Go | Engineering owner | Attach exact final runner output |
| Floating dependency specs removed | Complete | Existing evidence shows no forbidden specs | Engineering owner | Attach security CI output before Go |
| Audit-chain live validation | Exception | `audit-chain-live-validation.json` records target-live validation required; enterprise remains blocked until the target Supabase run is complete | Security reviewer | Required before enterprise Go |
| Upload scanning validation | Complete | `upload-malware-scan-validation.json` records Complete live provider proof and fail-closed policy | Security reviewer | Revalidate before enterprise release or provider change |
| Step-up MFA / IdP validation | Exception | `step-up-mfa-validation.json` records provider proof absent and enterprise release blocked without proof | Security reviewer | Required before enterprise Go |
| Stripe billing runtime validation | Complete | `stripe-billing-validation.json` records focused Stripe runtime proof passed | Engineering owner | Revalidate before billing provider or webhook handler changes |
| Observability readiness | Complete as repository evidence | `observability-readiness.json` records health/ready controls, logging, alerting and owner governance | SRE / release owner | Attach deployment smoke, drill/sign-off and rollback verification |
| Incident response owner | Complete | Named incident owner is recorded in the release approval record | Release owner | Attach acknowledgement/drill before Go |
| Rollback owner and rollback target | Exception | Named rollback owner and rollback target candidate are recorded; functional verification and dry-run are missing | Release owner | Required before Go |
| Support / customer communication owner | Complete | Named support and communication owners are recorded in the release approval record | Release owner | Attach customer notice/status-page decision before Go |

## Evidence storage rule

Do not commit screenshots or exports containing access-granting values. Redact sensitive values before storing evidence. Private evidence can be stored outside the repository, but the release approval must reference where it is stored and who reviewed it.

## External review release gate

External security review evidence is intentionally `Open` until a real third-party report or approved external review record exists. The placeholder JSON must not be used as proof of completion.

Enterprise release and enterprise procurement are blocked when any of the following is true:

- the external review evidence is missing or not `Complete`;
- the real report reference or report storage location is missing;
- any critical/high finding is neither resolved nor formally accepted;
- any critical finding has pending, failed, missing, or unreferenced retest evidence;
- the evidence contains placeholder values or claims completion without a real external report;
- this register and the external review JSON disagree about completion status.

Run the machine-checkable gate with:

```bash
npm run security:external-review
npm run release:enterprise-readiness
```

`npm run security:external-review` is expected to fail while the evidence is still Open and no real external report is attached. That failure is the correct enterprise procurement block.

## Go/No-Go rule

Public production, enterprise pilot, enterprise procurement and Conditional Go are blocked while any P0 runtime evidence item remains Open or under enterprise-blocking Exception. Enterprise release cannot use a private-beta exception for the external review, RLS live validation, MFA/IdP provider proof, audit-chain target-live validation, or final validation runner gates.

Current final decision: **No-Go**. No production, enterprise pilot, enterprise procurement, external-review, or buyer-ready claim is allowed from this evidence package.
