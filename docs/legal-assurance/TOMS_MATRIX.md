# RISCK COMPLY — GDPR Article 32 TOMs Matrix

Date: 2026-09-09  
Purpose: map contractual/Privacy security statements to implementation evidence without turning planned controls into implemented controls.

| TOM area | Current implementation/evidence | State | Contract/public-claim boundary |
|---|---|---|---|
| Authentication | Supabase Auth; server-side user validation; Google OAuth where enabled | PASS_IMPLEMENTED | Provider/configuration-specific availability only |
| Tenant isolation | organisation/workspace membership, tenant-scoped server checks and RLS posture | PASS_IMPLEMENTED_PENDING_EXACT_SHA_RUNTIME | Do not claim absolute isolation beyond evidence |
| RBAC / least privilege | role/permission model; privacy actions require specific permissions | PASS_IMPLEMENTED | Keep role definitions synchronized with runtime |
| Step-up for sensitive privacy actions | action-scoped step-up required for GDPR export/delete flows | PASS_IMPLEMENTED | Exact runtime evidence should be release-bound |
| Data export security | tenant scope, entitlement/RBAC, step-up, no-store responses, audit-before-return behavior | PASS_IMPLEMENTED | No claim that all possible exports share identical controls unless verified |
| Deletion request controls | trusted origin, RBAC, step-up, literal confirmation, safety delay/manual review | PASS_IMPLEMENTED | This proves intake/control workflow, not full downstream deletion completion |
| RLS / database authorization | extensive Supabase RLS/security assurance exists | PASS_IMPLEMENTED_PENDING_PRODUCTION_ACCEPTANCE | Final contract-grade statement should point to exact release/runtime evidence |
| Encryption in transit | managed HTTPS/TLS public service posture | PASS_PROVIDER_MANAGED | Avoid unsupported cipher/version guarantees unless evidenced |
| Encryption at rest | relies on managed provider controls | PENDING_PROVIDER_EVIDENCE | Do not overstate beyond provider account/config evidence |
| Audit logging | audit events/logs and fail-closed privacy export audit behavior | PASS_IMPLEMENTED | External immutability/SIEM not claimed unless implemented |
| Logging minimisation | GDPR operational controls prohibit secrets/unnecessary PII in logs; sanitized context | PASS_CONTROLLED | Runtime log-content sampling should be periodically revalidated |
| Secret management | server-side secret boundaries, scanning/release gates | PASS_IMPLEMENTED | Provider vault/KMS claims only if specifically evidenced |
| Secure SDLC | CI, code review, dependency/security scanning and protected release workflows | PASS_IMPLEMENTED | Independent certification is not implied |
| Vulnerability management | CodeQL/security checks plus pentest workstream | PARTIAL | Independent pentest remains separate external assurance |
| Incident response | `docs/INCIDENT_RESPONSE.md` operational playbook | PASS_DOCUMENTED | Personal-data-breach notification decision requires privacy/legal process |
| Backup/recovery | continuity documentation and restore/recovery lane evidence exists | PARTIAL_RUNTIME_EVIDENCE | No fixed RPO/RTO contractual claim unless exact current evidence supports it |
| Data minimisation | privacy operational control and descriptor-scoped exports | PASS_CONTROLLED | Requires product-data inventory maintenance |
| Retention | classes and workflow behavior documented, but final periods/enforcement are not approved | BLOCKED | No fixed retention guarantee may be contractual/public yet |
| Subprocessor governance | detailed review draft exists | PARTIAL | Legal role/transfer/account facts remain open |
| Monitoring/diagnostics | Sentry/other providers conditionally configured | PARTIAL_PROVIDER_BINDING | Claims must match exact Production configuration |
| Incident evidence preservation | playbook identifies deployment/log/event/SHA evidence | PASS_DOCUMENTED | Chain-of-custody quality requires execution evidence per incident |

## Article 32 gate

The core technical security model is materially implemented, but a final contractual TOM annex still needs exact Production/provider evidence and removal of unresolved retention/provider claims.

```text
TOMS_IMPLEMENTATION=STRONG_PARTIAL_PASS
TOMS_PROVIDER_EVIDENCE=PARTIAL
TOMS_RETENTION_COMPONENT=BLOCKED
CONTRACT_GRADE_TOMS_ANNEX=BLOCKED
GDPR_TOMS_ART32=BLOCKED_FOR_FINAL_CONTRACT
```

This state does not mean the platform lacks security controls; it means the legal/contractual TOM schedule is not yet fully evidence-bound.