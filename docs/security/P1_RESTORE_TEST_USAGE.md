# P1 Restore Test Evidence Workflow

This control tracks tested restore capability for critical systems. The evidence file must remain absent until a real restore has completed and received review approval.

## Files

- Template: `docs/security/evidence/p1/backup-restore-tested.template.json`
- Final evidence: `docs/security/evidence/p1/backup-restore-tested.json`
- Checker: `scripts/security/check-p1-restore-test-evidence.mjs`
- Final P1 schema gate: `scripts/security/check-p1-final-evidence-files.mjs`

## Required execution boundary

- Source environment: production backup.
- Restore target: a separate `recovery-isolated` project or environment.
- Source and target project references must differ.
- Never run a destructive restore against the production project.
- Do not commit credentials, connection strings, backup contents, customer data, or raw provider payloads.

## Required evidence

Each restore test must record:

- provider backup ID;
- encryption confirmation and SHA-256 checksum;
- start/completion timestamps;
- measured numeric RTO target and actual seconds;
- measured numeric RPO target and actual seconds;
- restore job/report reference;
- restored-data integrity reference;
- post-restore RLS/tenant-isolation reference;
- named reviewer, review date and next review due date.

## Workflow

1. Schedule an owner-approved recovery window.
2. Restore a production backup into a separate isolated recovery target.
3. Run restored-data integrity checks and live tenant-isolation/RLS validation against the recovery target.
4. Copy the template to the final evidence path.
5. Replace all placeholders with reviewed, non-sensitive references and measured values.
6. Run:

```bash
node scripts/security/check-p1-restore-test-evidence.mjs
node scripts/security/check-p1-final-evidence-files.mjs
node scripts/security/check-p1-evidence-index.mjs
```

7. Update `P1_EVIDENCE_INDEX.json` to `Complete` only in the same reviewed evidence PR, including reviewer and review dates.
8. Regenerate `P1_PROGRESS.md` and let all required CI complete.

Preparation or repository tests do not close this control. Missing final evidence remains `Open` / `NOT_VERIFIED`.
