# Enterprise progress

Observed protected main baseline on 2026-08-24:
`41cc6656de9a9d9df06b549dc1309d481498758b`

Decision: **NO_GO / CURRENT-MAIN SCORE UNKNOWN**

## Evidence status

The last accepted score remains historical evidence only:

- historical completion: **45%** (**45 PASS**, **1 BLOCKED**, **54 NOT_VERIFIED**);
- assessed SHA: `c413288eb8453b55c4d049c758dc0cd063aa70b9`;
- scorecard run: `29703295579`;
- freshness: **STALE**;
- current Enterprise publication recommendation: **DO_NOT_PUBLISH_AS_ENTERPRISE**.

No PR, repository-only test, disposable database replay, green CI result or pentest scoping meeting raises that score. A new percentage or `ENTERPRISE_100: PASS` is valid only after the canonical exact-current-main authority accepts all required protected runtime and human evidence.

## Current authority state

Protected main now includes #1819, which binds live RLS validation to the current governed Supabase forward-promotion artifact and removes stale fixed migration-count authority from that proof path. #1819 does **not** execute or authorize a Production database write.

Connected Vercel Production for the observed main is `dpl_FEUDn9oPpzetNwZcu3N5qJWmeAtZ`, `READY / production`, with canonical origin `https://www.risckcomply.com`.

External Security Assurance has advanced from generic vendor outreach to a real Layer8 scoping session confirmed for 2026-08-25 10:00–11:00 Europe/Lisbon. Canonical #1692 is synchronized to that state. PR #1822 refreshes the pentest handoff and dedicated meeting pack; it is preparation only and does not claim engagement or pentest completion.

## Mandatory direct authorities

The final authority must remain `NO_GO` until the same accepted release lineage has sufficient evidence from:

1. Product FRIA Ephemeral Runtime QA;
2. Final Billing + Product Live Closeout;
3. Supabase Forward Production Acceptance;
4. Production Provider Runtime Proof;
5. External Security Assurance Acceptance.

Legal publication/acceptance, recovery, deployment/smoke, runtime closeout and final Go/No-Go controls remain independently required by the shared closure contract.

## Immediate priorities

### External assurance — owner/human
Use the confirmed Layer8 meeting to close contracting entity, applicable CREST accreditation, tester/independence handling, NDA, ROE, exact release binding, synthetic-account and secret-sharing approach, methodology/severity, evidence retention, report/retest deliverables, price/duration and next execution window. Do not authorize active testing until these items and explicit owner authorization are in place.

### Technical authority
Continue the current governed Supabase Production decision/promotion/recovery path only under exact-current-main evidence and its independent approval plus explicit owner Production-write authorization. Do not treat pre-promotion live-RLS proof as Production acceptance.

This versioned file is a synchronized handoff, not an exact-current-main runtime authority. Generated protected workflow artifacts remain the canonical exact-SHA evidence source.
