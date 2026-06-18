# P1 close-to-7 runbook

This runbook tracks the safest path from the current P1 evidence state to 7 of 10 completed controls.

## Current verified state

- P1-08 centralized logging and alerts: Complete.
- P1-10 WAF/CDN/DDoS: Complete.
- P1-06 SBOM and artifact attestation: Complete.

Current final evidence progress: 3/10.

## Controls targeted next

### P1-05 DAST automated

Automation is present in `.github/workflows/p1-dast-baseline.yml`.

To close the control, collect a successful production run and artifact reference for `p1-dast-baseline-report`, then create:

```text
docs/security/evidence/p1/dast-automated.json
```

Do not mark complete unless the report was reviewed.

### P1-04 Distributed rate limit for sensitive endpoints

Implementation and evidence validation are present. To close the control, collect a redacted production reference showing the distributed backend is configured and active for sensitive endpoints, then create:

```text
docs/security/evidence/p1/distributed-rate-limit-sensitive-endpoints.json
```

Do not include access values or connection strings.

### P1-09 Verifiable production audit chain

Evidence validation is present. To close the control, collect a production verification reference showing chain continuity, checkpoint or root hash, covered period, and event classes, then create:

```text
docs/security/evidence/p1/audit-chain-verifiable.json
```

### P1-07 Backup restore tested

Evidence validation is present. To close the control, collect restore test evidence showing backup source, restore environment, completion time, validation result, and reviewer, then create:

```text
docs/security/evidence/p1/backup-restore-tested.json
```

## Completion rules

Each final evidence PR must:

1. Add exactly one final evidence JSON when possible.
2. Update `docs/security/evidence/p1/P1_EVIDENCE_INDEX.json`.
3. Update `docs/security/evidence/p1/P1_PROGRESS.md`.
4. Pass the P1 final evidence gate.
5. Avoid placeholders and non-redacted operational values.

## Target sequence

1. P1-05 DAST: 4/10.
2. P1-04 distributed rate limit: 5/10.
3. P1-09 audit chain: 6/10.
4. P1-07 backup restore: 7/10.

This runbook does not mark any control complete by itself.
