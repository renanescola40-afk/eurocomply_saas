# Conversation Final Enterprise Closeout

## Purpose

This runbook closes all repository-controlled work from the Enterprise readiness program without claiming that code, CI or templates are production evidence.

## Required accepted evidence

The protected workflow requires ten exact-SHA JSON files in `docs/security/evidence/accepted/`:

1. repository final closeout;
2. runtime closeout;
3. Supabase production migration attestation;
4. Supabase live RLS validation;
5. backup and restore test;
6. Stripe production validation;
7. production observability validation;
8. independent external security review;
9. qualified legal review;
10. independent final approvals.

Every file must be real, current, non-synthetic, bound to the current `main` SHA and independently reviewed where owner/reviewer fields exist.

## Execution

1. Freeze the intended release SHA.
2. Confirm it is still the exact current `main` SHA.
3. Store only reviewed evidence under the accepted evidence directory.
4. Run **Conversation Final Enterprise Closeout** manually with the full SHA.
5. Retain the generated artifact for the release record.
6. Treat `BLOCKED` as authoritative until each reported blocker is resolved.

## Closure rule

`CLOSED` means all ten mandatory controls supplied accepted evidence for one exact SHA. It does not guarantee customer-specific EU AI Act compliance, replace legal advice or represent an external certification.

## Remaining owner/external actions

No further PR can substitute for production execution, provider-console configuration, penetration testing, legal review, signed founder facts or independent operational approval.
