# P1 Enterprise Security Roadmap

P1 moves the product from P0 release readiness into stronger enterprise security posture.

## Scope

The P1 program contains ten controls:

1. SSO/SAML/OIDC
2. Admin MFA enforcement
3. Step-up authentication for sensitive actions
4. Distributed rate limiting on sensitive endpoints
5. Automated DAST
6. SBOM and artifact attestation
7. Tested backup and restore
8. Centralized logs and alerts
9. Verifiable production audit chain
10. WAF/CDN/DDoS protection

## Execution model

Each control should be delivered as a small PR containing:

- implementation or configuration change;
- evidence JSON under `docs/security/evidence/p1/`;
- register update in `docs/security/P1_ENTERPRISE_SECURITY_REGISTER.md`;
- validator updates when the control needs custom validation.

## Recommended order

1. Admin MFA enforcement
2. SSO/SAML/OIDC
3. Step-up authentication for sensitive actions
4. Distributed rate limiting on sensitive endpoints
5. Centralized logs and alerts
6. Verifiable production audit chain
7. Backup/restore tested
8. SBOM and artifact attestation
9. Automated DAST
10. WAF/CDN/DDoS

## Completion rule

P1 should not be declared complete until the register shows every control as `Complete` or an explicitly approved `Exception` and the P1 readiness checker passes.
