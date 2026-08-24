# Owner action required

This handoff was synchronized from protected `main@41cc6656de9a9d9df06b549dc1309d481498758b` on 2026-08-24. Before any runtime or Production action, resolve the current 40-character `main` SHA again.

## Immediate external action — Layer8 pentest scoping

Attend the confirmed Layer8 scoping session on **2026-08-25, 10:00–11:00 Europe/Lisbon, Microsoft Teams** and close the external inputs that cannot be fabricated by repository work.

The owner should leave the session with, or with an explicit follow-up owner/date for:

1. Layer8 contracting legal entity and engagement contact;
2. applicable CREST Penetration Testing accreditation for the proposed service;
3. named/qualified tester or technical lead model and independence/conflict handling;
4. NDA/confidential-information process before detailed secrets or credentials are shared;
5. Rules of Engagement process covering exact hostname/environment/SHA/deployment, dates, source IPs where applicable, emergency contacts and stop conditions;
6. agreement on synthetic multi-tenant test accounts and private credential-sharing channel;
7. methodology and severity model;
8. report format with unique findings, affected surfaces, reproduction/evidence, recommendations and executive/procurement summary;
9. Critical/High remediation retest terms and closure statement/retest report;
10. price, expected duration and earliest available execution window.

The meeting itself does **not** authorize active testing, create a purchase, sign an NDA/ROE or freeze the current release permanently.

## Owner authorization barrier before active pentest

Do not authorize active testing until all of the following exist in writing:

- accepted scope and exclusions;
- agreed NDA/confidential handling where required;
- accepted Rules of Engagement;
- exact test target/release binding;
- safe synthetic test-account plan and secret-sharing channel;
- agreed testing window/timezone;
- emergency/escalation contacts;
- source-IP handling where applicable;
- evidence/data-retention terms;
- explicit stop conditions;
- explicit owner authorization to begin testing.

No DoS/DDoS, destructive database activity, attacks on real users, credential stuffing, uncontrolled extraction of customer data, provider-infrastructure attacks outside the RISCK COMPLY integration boundary or unauthorized real payment activity.

## Separate Production authority

The Supabase forward-production lane remains independently governed. #1819 binds live RLS proof to the current forward-promotion artifact but does not authorize or execute a Production database write. Any Production promotion still requires its own exact-current-main evidence, required independent approval and separate explicit owner Production-write authorization.

## Final Enterprise barrier

Repository preparation, CI, internal security testing and the Layer8 scoping meeting do not themselves produce `INDEPENDENT_PENTEST: PASS`, `ENTERPRISE_100: PASS` or `PRODUCTION_GO: PASS`. Those statuses require the real independent report/retest and all other protected runtime/legal authorities.
