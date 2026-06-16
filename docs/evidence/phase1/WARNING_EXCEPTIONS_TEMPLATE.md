# Phase 1 Warning Exceptions Template

Use this template only when a Phase 1 warning remains after remediation and is proposed as non-blocking.

## Warning summary

- Source log:
- Command:
- Warning text:

## Impact assessment

- Runtime impact:
- Security impact:
- Tenant isolation impact:
- Billing impact:
- Data-loss impact:

## Decision

- Classification: blocking | accepted non-blocking
- Reason:
- Owner:
- Follow-up date:

## Review checklist

- [ ] Related command exits with code 0.
- [ ] Warning does not indicate a high or critical security finding.
- [ ] Warning does not affect production build output.
- [ ] Warning does not bypass auth, tenant isolation, billing, or audit logging.
- [ ] Follow-up is tracked before Phase 1 is marked complete.

## Final note

Phase 1 cannot be marked complete while this warning is classified as blocking.
