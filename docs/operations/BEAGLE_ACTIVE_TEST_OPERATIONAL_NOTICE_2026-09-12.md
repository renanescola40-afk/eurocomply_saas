# RISCK COMPLY — Beagle Active Test Operational Notice

Date: 2026-09-12
Owner instruction: canonical cross-lane operating rule while the current Beagle Security assessment remains unfinished.

## Product / target

- Product: RISCK COMPLY
- Repository: `renanescola40-afk/eurocomply_saas`
- Production: `https://www.risckcomply.com`
- External automated assessment: Beagle Security

## Current truth

```text
BEAGLE_TEST_OFFICIALLY_FINISHED=false
BEAGLE_REPORT_AVAILABLE=false
BEAGLE_REPORT_UI="You need to complete the test before generating a report."
EXTERNAL_AUTOMATED_UNAUTHENTICATED_VAPT=IN_PROGRESS
BEAGLE_AUTOMATED_SCAN_OWNER_CONTINUATION_AUTHORIZED=true
GENERAL_PRODUCTION_PENTEST_AUTHORIZED=false
INDEPENDENT_HUMAN_PENTEST=NOT_PASS
ZERO_COST_PENTEST_CLOSURE_PERCENT=89
ZERO_COST_PENTEST_REMAINING_PERCENT=11
```

The Beagle assessment is external automated unauthenticated VAPT evidence. The owner has explicitly authorized the **currently running Beagle automated unauthenticated scan against the existing target to continue**. That scoped continuation authorization does not authorize a broader Production pentest, authenticated testing, a different target, destructive activity, a human-assessor engagement, or any new testing technique.

The Beagle evidence must not be promoted to independent human penetration-test credit.

## Work that remains allowed

During the active Beagle assessment, lanes may continue normal engineering and assurance work, including:

- create branches and pull requests;
- implement and review code changes;
- fix bugs, checks and workflows;
- run CI and repository workflows;
- inspect logs;
- prepare documentation and evidence packages;
- continue billing, legal and security work;
- prepare remediation for future findings;
- perform read-only Production analysis;
- work through governed GitHub, Vercel and Supabase workflows where this does not perform dangerous manual Production mutation.

## Merge / deploy rule

Merge and deploy are not globally frozen solely because the Beagle assessment is still running.

If a merge or deploy is necessary to continue the SaaS, it may proceed through normal repository/release governance. However, every post-scan merge/deploy creates a newer version than the version observed by the current Beagle assessment.

Before any such merge/deploy:

1. preserve current Beagle screenshots/status evidence;
2. preserve the current test state and available timestamps/target metadata;
3. do not delete reports, logs, screenshots or test evidence;
4. record that the Beagle evidence belongs to the version/deployment that was tested before later merges/deploys;
5. do not imply that a later release inherited Beagle coverage unless it is separately revalidated.

## Actions that remain prohibited without explicit owner authority

Do not:

- cancel or pause the current Beagle test merely for workflow/release convenience;
- alter the Beagle target `www.risckcomply.com`;
- enable Beagle scheduler;
- enable authenticated Production testing during this assessment;
- run destructive tests, brute force, credential stuffing, stress, DoS or load testing;
- delete Beagle screenshots, reports, logs or other pentest evidence;
- alter DNS/domain for `www.risckcomply.com` merely to facilitate the test;
- alter Production OAuth/Auth without a real operational requirement;
- manually mutate Supabase Production without explicit authorization;
- alter Production environment variables without a real operational requirement;
- mark `INDEPENDENT_HUMAN_PENTEST=PASS`;
- claim that a completed independent human pentest exists.

### Emergency-stop override

The prohibition on pausing/cancelling does **not** override canonical emergency stop conditions. Stop the active testing immediately and preserve evidence if any of the following occurs:

- real customer data is observed or becomes accessible;
- credentials, secrets, live payment data or Production tokens are exposed;
- a verified cross-tenant path, Critical auth/RBAC/BOLA/IDOR bypass or equivalent severe security condition is found after minimum proof;
- destructive behavior occurs outside approved synthetic fixtures;
- material service degradation, instability or provider risk is observed;
- continued testing could materially increase customer or provider risk.

Emergency stop is a safety action, not a cancellation for convenience. Notify/escalate to the owner/security contact as soon as practicable after stopping.

## Truth rule when the Beagle report becomes available

`AUTOMATED_EXTERNAL_VAPT=PASS` may be recorded only if all of the following are true:

```text
BEAGLE_TEST_COMPLETED=true
BEAGLE_REPORT_AVAILABLE=true
CRITICAL_OPEN=0
HIGH_OPEN=0
FINDINGS_TRIAGED=true
BEAGLE_EVIDENCE_PRESERVED=true
```

Even then:

```text
INDEPENDENT_HUMAN_PENTEST=OPEN
```

unless a genuinely independent human penetration-test engagement separately satisfies the canonical external-assurance acceptance criteria.

## Cross-lane instruction

All lanes should continue normal work in branches, PRs, CI, billing, legal, security and evidence preparation. They must not directly disturb the active Beagle assessment or destroy its evidence, except that canonical emergency stop conditions remain immediately enforceable.

Every status update concerning the zero-cost Beagle closure should report both completion and remaining percentages. Current baseline:

```text
ZERO_COST_PENTEST_CLOSURE_PERCENT=89
ZERO_COST_PENTEST_REMAINING_PERCENT=11
```

Percentages are operational progress estimates, not security certification or legal assurance.
