# P1 Enterprise Security Register

This register tracks the P1 enterprise security controls required after P0 readiness.

| Control | Status | Evidence target | Notes |
| --- | --- | --- | --- |
| SSO/SAML/OIDC | Open | `docs/security/evidence/p1/sso-saml-oidc.json` | Enterprise identity integration and access-boundary evidence. |
| MFA obrigatório para admins | Open | `docs/security/evidence/p1/admin-mfa-required.json` | Admin MFA enforcement evidence. |
| Step-up real para billing, exports, team management, GDPR delete | Open | `docs/security/evidence/p1/step-up-sensitive-actions.json` | Sensitive action re-authentication evidence. |
| Rate limit distribuído em todos endpoints sensíveis | Open | `docs/security/evidence/p1/distributed-rate-limit-sensitive-endpoints.json` | Distributed throttling evidence for sensitive endpoints. |
| DAST automatizado | Open | `docs/security/evidence/p1/dast-automated.json` | Automated dynamic testing evidence. |
| SBOM + artifact attestation | Open | `docs/security/evidence/p1/sbom-artifact-attestation.json` | Build provenance and dependency inventory evidence. |
| Backup/restore testado | Open | `docs/security/evidence/p1/backup-restore-tested.json` | Restore test evidence and recovery notes. |
| Logs centralizados e alertas | Open | `docs/security/evidence/p1/centralized-logs-alerts.json` | Central logging and alert coverage evidence. |
| Audit chain verificável em produção | Open | `docs/security/evidence/p1/verifiable-production-audit-chain.json` | Production audit integrity evidence. |
| WAF/CDN/DDoS | Open | `docs/security/evidence/p1/waf-cdn-ddos.json` | Edge protection and DDoS readiness evidence. |

## Status definitions

- `Open`: not yet implemented or evidence not collected.
- `In Progress`: implementation or evidence collection started.
- `Complete`: implementation and evidence accepted.
- `Exception`: explicit risk acceptance with owner, expiry, and compensating controls.

P1 is complete only when all controls are `Complete`, or explicitly approved `Exception` where allowed by policy.
