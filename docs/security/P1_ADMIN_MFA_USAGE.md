# P1 Admin MFA Evidence Workflow

This control tracks mandatory MFA enforcement for administrators.

## Files

- Template: `docs/security/evidence/p1/admin-mfa-required.template.json`
- Final evidence: `docs/security/evidence/p1/admin-mfa-required.json`
- Checker: `scripts/security/check-p1-admin-mfa-evidence.mjs`

## Workflow

1. Collect redacted evidence from admin identity providers and admin access surfaces.
2. Copy the template to `docs/security/evidence/p1/admin-mfa-required.json`.
3. Replace placeholders with reviewed, redacted references.
4. Run:

```bash
node scripts/security/check-p1-admin-mfa-evidence.mjs
```

5. Update `docs/security/P1_ENTERPRISE_SECURITY_REGISTER.md` from `Open` to `Complete` or approved `Exception`.
6. Open a final evidence PR.

## Completion criteria

The evidence must show:

- admin users require MFA;
- admin roles/groups were reviewed;
- admin surfaces are covered;
- break-glass accounts are documented and protected;
- no secrets or access-granting values are committed.

This preparation PR does not close the control by itself.
