# P1 Identity Access Evidence Workflow

This control tracks enterprise SSO through SAML or OIDC.

## Files

- Template: `docs/security/evidence/p1/sso-saml-oidc.template.json`
- Final evidence: `docs/security/evidence/p1/sso-saml-oidc.json`
- Checker: `scripts/security/check-p1-identity-access-evidence.mjs`

## Workflow

1. Collect redacted evidence from the enterprise identity provider.
2. Copy the template to the final evidence path.
3. Replace placeholders with reviewed, redacted references.
4. Run:

```bash
node scripts/security/check-p1-identity-access-evidence.mjs
```

5. Update `docs/security/P1_ENTERPRISE_SECURITY_REGISTER.md` from `Open` to `Complete` or approved `Exception`.
6. Open a final evidence PR.

## Completion criteria

The evidence must show:

- SAML or OIDC is configured for enterprise access;
- organization or tenant scope is reviewed;
- role and group mappings are reviewed;
- deprovisioning behavior is documented;
- no secrets or access-granting values are committed.

This preparation PR does not close the control by itself.
