# P1 Admin MFA Evidence Workflow

This control tracks mandatory MFA enforcement for administrators.

The platform-admin guard in `src/server/security/platform-admin.ts` enforces two independent conditions: an enabled allow-listed platform role and a current Supabase Auth session at `aal2`. An `aal1` session is denied, and an assurance-provider error fails closed. This repository contract covers the Sales Console pages and mutations because all of them call `requirePlatformAdmin`.

## Files

- Template: `docs/security/evidence/p1/admin-mfa-required.template.json`
- Final evidence: `docs/security/evidence/p1/admin-mfa-required.json`
- Checker: `scripts/security/check-p1-admin-mfa-evidence.mjs`

## Workflow

1. Collect redacted evidence from admin identity providers and admin access surfaces.
2. Validate that an allow-listed admin with `aal1` is denied and the same user with `aal2` is allowed on every admin surface.
3. Review the provider MFA policy and break-glass population outside the repository.
4. Copy the template to `docs/security/evidence/p1/admin-mfa-required.json`.
5. Replace placeholders with reviewed, redacted references.
6. Run:

```bash
node scripts/security/check-p1-admin-mfa-evidence.mjs
```

7. Update `docs/security/P1_ENTERPRISE_SECURITY_REGISTER.md` from `Open` to `Complete` or approved `Exception`.
8. Open a final evidence PR.

## Completion criteria

The evidence must show:

- admin users require MFA;
- admin roles/groups were reviewed;
- admin surfaces are covered;
- break-glass accounts are documented and protected;
- no secrets or access-granting values are committed.

This preparation PR does not close the control by itself.

Repository tests prove only the guard contract. They are not production MFA evidence and must not be copied into the final evidence file as a substitute for provider-backed `aal2`, admin-population and break-glass validation.
