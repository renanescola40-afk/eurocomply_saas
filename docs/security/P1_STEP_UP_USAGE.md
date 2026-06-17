# P1 Step-Up Evidence Workflow

This control tracks step-up authentication for sensitive actions.

## Files

- Template: `docs/security/evidence/p1/step-up-sensitive-actions.template.json`
- Final evidence: `docs/security/evidence/p1/step-up-sensitive-actions.json`
- Checker: `scripts/security/check-p1-step-up-evidence.mjs`

## Required sensitive actions

- Billing changes
- Data exports
- Team management
- GDPR delete requests

## Workflow

1. Collect redacted evidence for each sensitive action.
2. Copy the template to the final evidence path.
3. Replace placeholders with reviewed, redacted references.
4. Run:

```bash
node scripts/security/check-p1-step-up-evidence.mjs
```

5. Update `docs/security/P1_ENTERPRISE_SECURITY_REGISTER.md` from `Open` to `Complete` or approved `Exception`.
6. Open a final evidence PR.

## Completion criteria

The evidence must show:

- each required action enforces step-up authentication;
- step-up state expires and cannot be reused indefinitely;
- authorization is rechecked after step-up;
- audit events are emitted;
- no secrets or access-granting values are committed.

This preparation PR does not close the control by itself.
