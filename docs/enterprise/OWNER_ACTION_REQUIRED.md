# Owner action required

This handoff was synchronized from
`main@14618ac687eac03c95b7b6573ccec50498631b38`. Before any action, resolve the
current 40-character `main` SHA again; do not assume this versioned baseline is
still the default-branch head.

The next unavoidable owner actions are:

1. complete the qualified independent decisions for the exact bounded Supabase
   V17 migration inventory tracked by issue #1631;
2. approve the protected Decision Gate only for that exact reviewed inventory
   and release SHA;
3. separately authorize the bounded Production promotion only after the
   rehearsal, dry-run, decision package and recovery prerequisites pass;
4. run and retain post-promotion Supabase acceptance, live RLS/tenant-isolation,
   recovery and Enterprise/SCIM runtime evidence for the same exact SHA;
5. execute or approve the remaining protected direct-authority workflows:
   Product FRIA QA, Billing + Product LIVE closeout, Production Provider Runtime
   Proof, Public Production Final and External Security Assurance Acceptance;
6. complete the separately required legal and independent-security acceptance
   before the canonical final authority may emit `ENTERPRISE_100: PASS` or
   `PRODUCTION_GO: PASS`.

No owner action should bypass a required check, fabricate evidence, reuse a
decision or artifact from another SHA, weaken branch/environment protection,
repair migration history without schema proof, or perform an unrestricted
production database push. Repository policy in `AGENTS.md` reserves the final
merge for a human owner.
