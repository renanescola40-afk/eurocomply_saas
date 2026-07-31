# Enterprise Final Closeout Runbook

## Purpose

This runbook describes the final repository-controlled step for closing the Enterprise readiness program for one exact production SHA. The workflow compiles previously accepted artifacts; it does not create evidence, perform production changes, replace legal advice, or waive unresolved risk.

## Preconditions

Before dispatching `Enterprise Final Closeout`, confirm all of the following:

1. The requested SHA is the current full 40-character SHA of `main` and is the deployed production build.
2. Enterprise Runtime Evidence Closeout completed successfully for the same SHA.
3. Supabase migration execution and post-execution attestation completed for the same SHA.
4. Backup and restore evidence is current and accepted.
5. External security review and qualified legal review are current, independent and within their validity period.
6. Release, Security and Operations approvals are from distinct accountable reviewers.
7. Enterprise Evidence Intake completed successfully and produced `enterprise-evidence-intake.json`.
8. Enterprise Final Decision produced an authoritative `ENTERPRISE_GO` decision for the same SHA.
9. Enterprise Closeout Queue contains exactly ten `COMPLETE` domains for the same SHA.
10. No unresolved risk acceptance remains open.

## Required workflow inputs

- `evidence_intake_run_id`: successful run containing the accepted intake artifact.
- `final_decision_run_id`: successful run containing the authoritative decision artifact.
- `closeout_queue_run_id`: successful run containing the ten-domain closeout queue.
- `expected_sha`: exact current `main` SHA.

The workflow rejects stale SHAs, unsuccessful source runs, expired artifacts and missing provenance.

## Successful output

A successful run uploads an immutable 90-day artifact named:

```text
enterprise-final-closeout-<sha>
```

It contains:

- `enterprise-final-closeout.json`
- `enterprise-final-closeout.md`

`status: CLOSED` and `enterpriseGo: true` are emitted only when every required condition passes. The artifact retains explicit truth boundaries: repository checks are not runtime proof, customer-specific legal compliance is not proven, and no production write is performed.

## Failure handling

When the workflow fails:

1. Download the generated closeout packet when available.
2. Read the `blockers` array.
3. Route each blocker to the accountable domain owner.
4. Regenerate only the affected upstream evidence through its authoritative workflow.
5. Re-run Evidence Intake and Final Decision for the same current SHA.
6. Re-dispatch Final Closeout with the new successful run IDs.

Never edit generated JSON to force a pass. Never copy one evidence digest across domains. Never reuse evidence from another SHA.

## Closure procedure

After a successful final closeout:

1. Attach the artifact URL and workflow URL to the Enterprise control-tower issue.
2. Record the exact SHA and deployment URL.
3. Record the approval identities and evidence expiry dates.
4. Close only issues whose acceptance criteria are fully satisfied by the artifact.
5. Keep external legal, security and operational obligations open when they require renewal or periodic reassessment.

## Non-goals

This workflow does not certify the company, guarantee EU AI Act compliance, replace counsel, execute migrations, deploy production, run a penetration test, approve risk, or make customer-specific legal conclusions.
