# Owner action required

Last reconciled: 2026-09-10

## Current state

There is **no immediate owner action required to continue repository-only pre-pentest preparation** under #2048.

Current exact evidence at reconciliation:

- protected `main`: `c00379cc6564bb4f76a17089295e6724e8dcae7c`;
- latest observed Vercel Production: `dpl_BznNuFKG8UEh4yW8y9HQyzLXDiJ9` on `13b19410caa20045b19d98d58df406c43433af5a`;
- Production is not exact-current-main;
- fresh `/api/health`: HTTP 200;
- #1983 remains open pending exact-SHA Production convergence and sustained runtime acceptance;
- #1948 remains open pending corrected-release Production revalidation;
- #1849 is closed;
- independent pentest provider selection remains open;
- 7ASecurity is `HOLD_NOT_SELECTED_BY_OWNER` and must not be advanced by this lane.

The previously listed Layer8 meeting on 2026-08-25 has passed and is historical evidence only. It is not a current owner task.

## Next unavoidable owner decisions — not yet due

The following actions become owner-required only when their prerequisites are actually ready.

### 1. Production release / data-plane authority

Any Production deployment, Supabase Production write/promotion, rollback/restore, secret rotation or equivalent consequential Production change must use its own governed technical lane and explicit owner authority where required. This pentest-preparation document does not grant that authority.

### 2. Final independent assessor selection

Select the terminal independent assessor only after written evidence is sufficient to compare:

- legal/delivery entity;
- named or attributable testing/review responsibility;
- independence/conflict handling;
- relevant web/API penetration-testing competence;
- all mandatory RISCK COMPLY terminal scope areas or an explicitly accepted gap strategy;
- methodology/severity model;
- confidential evidence/credential handling;
- attributable executive + technical report;
- remediation retest and written closure terms;
- price, if any, and any commercial commitment.

7ASecurity is not selected and is intentionally held. Candidate status must not be converted into terminal pentest credit.

### 3. Final Rules of Engagement and test GO

After the final release and dedicated test environment are frozen and a provider is selected, owner approval is required for the final written ROE. It must bind:

- exact test hostname/environment;
- exact 40-character Git SHA and deployment identifier;
- testing window/timezone;
- synthetic tenant/account matrix;
- secure credential-transfer method;
- source IPs/allowlisting where applicable;
- evidence/data-retention terms;
- emergency/escalation contacts;
- explicit exclusions and stop conditions;
- report/retest deliverables.

Only after the ROE is accepted may the owner issue a separate explicit GO to begin active testing.

## Standing authorization barrier

Until those future decisions are reached, do **not**:

- authorize active pentest traffic;
- release passwords, session material, service-role keys or other secrets;
- use real customer data;
- use Stripe live-mode payments for pentest activity;
- sign or accept a provider contract or paid add-on without separate authority;
- represent a proposal, scanner, CI result, DAST run, internal review or readiness checklist as an independent pentest;
- mark `external-security-review-or-pentest.json` Complete without the real attributable external evidence.

The canonical default active-test model remains a dedicated non-production environment using synthetic data. Production testing requires the separate Production-testing exception defined by `docs/security/PENTEST_SCOPE.md` and its own explicit owner authorization.
