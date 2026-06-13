# Enterprise trust readiness roadmap

Status: active internal roadmap.

## Rule

Do not claim ISO 27001, SOC 2, pentest completion, SSO/SAML, mandatory MFA, tested disaster recovery, tested backup restore, contractual SLA, 24/7 monitoring, or immutable audit trails until implementation, testing, documentation, and approval evidence exist.

## Documentation review checklist

- [ ] Legal review: `docs/trust/DPA_DRAFT.md`
- [ ] Provider review: `docs/trust/SUBPROCESSORS.md`
- [ ] Product/legal review: `docs/trust/RETENTION_POLICY_DRAFT.md`
- [ ] Commercial/legal review: `docs/trust/SLA_DRAFT.md`
- [ ] Execute: `docs/trust/BACKUP_RESTORE_TEST_PLAN.md`
- [ ] Execute: `docs/trust/DISASTER_RECOVERY_TEST_PLAN.md`
- [ ] Vendor scheduling: `docs/trust/PENTEST_READINESS.md`
- [ ] Audit readiness: `docs/trust/ISO27001_SOC2_READINESS.md`
- [ ] Product implementation: `docs/trust/SSO_MFA_ENTERPRISE_PLAN.md`
- [ ] Product implementation: `docs/trust/AUDIT_LOG_EXPORT_IMMUTABILITY_PLAN.md`
- [ ] Questionnaire review: `docs/trust/ENTERPRISE_SECURITY_QUESTIONNAIRE.md`

## Implementation backlog

- [ ] Generate and commit `package-lock.json` with npm@10.8.2.
- [ ] Resolve npm audit moderate/high findings with targeted dependency changes.
- [ ] Replace floating dependency specs (`latest`) with exact audited versions.
- [ ] Run production-like RLS / tenant-isolation evidence collection.
- [ ] Implement tenant-level SSO/SAML.
- [ ] Implement tenant-level mandatory MFA.
- [ ] Implement audit log export.
- [ ] Implement tamper-evident or immutable audit retention.
- [ ] Execute backup restore test and archive evidence.
- [ ] Execute DR tabletop/failover test and archive evidence.
- [ ] Complete third-party penetration test and remediation.
- [ ] Finalize DPA, subprocessors, retention policy, and SLA with counsel.
- [ ] Decide ISO 27001 vs SOC 2 Type I first audit path.

## Evidence promotion criteria

A trust item moves from `draft/planned` to `available` only when:

1. The feature/control is implemented.
2. Tests or external evidence exist.
3. Documentation is reviewed by the responsible owner.
4. Legal/commercial approval exists where required.
5. The customer-safe answer has been updated.

## Guardrail

`npm run security:trust-package` verifies the trust package remains present and preserves key disclaimers against over-claiming.
