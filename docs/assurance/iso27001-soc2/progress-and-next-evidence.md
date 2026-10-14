# ISO 27001 + SOC 2 execution register — 2026-10-14
Status: Draft, not externally audited; no management signoff.

## Progress semantics
**Control inventory initialized:** 93 / 93 = 100% (only IDs and domains; NOT implementation).
**ISO Annex A applicability reviewed:** 0 / 93 = 0% documented in this register.
**ISO Annex A evidence verified:** 0 / 93 = 0% independently reviewed in this register.
**ISO 27001 overall readiness:** NOT YET MEASURABLE, because clauses 4–10 and operational controls are not assessed.
**SOC 2 Type I/II readiness:** NOT YET MEASURABLE.

The 0% figures reflect review activity **within this new register**, not a claim that the organization's controls are absent.

## Prior observations requiring tests
- Supabase 115/115 public tables had rowsecurity=true during read-only check. Verify effective policy behavior and other schemas before treating as operating control evidence.
- Root SECURITY.md exists and explicitly prohibits unsupported ISO/SOC 2 claims. Actual incident handling operations remain unverified.
- Current Vercel production-target deployment was READY in prior session; no proof of user-session or DataGuard experience.

## 2026-10-14 execution guard
- No emails, no production changes, no DataGuard account interactions, no live Stripe mutations.
- Branch-only documentation. Separate approval needed for shared production rollout.

## Next evidence actions
1. Set ISMS legal scope and nominated management owner.
2. Assess clauses 4–10 and define risk scoring/acceptance rules.
3. Review applicability of each Annex A control and create justified SoA.
4. Map Trust Services security criteria to specific operational controls, owners and frequencies.
5. Capture signed management reviews, access reviews, vulnerability remediation records and approved backup drills as they actually occur.
6. Confirm production SHA/main SHA and protected branch release gating.
7. Verify Supabase RLS policy behavior in isolated test tenant without using DataGuard data.
8. Schedule third-party certification and attestation only after separate approval.

## Audit integrity
No retroactive attestations. Documentation created does not equal implemented control. A readiness score is not a certificate or independent opinion.
