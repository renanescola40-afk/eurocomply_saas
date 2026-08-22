# Owner action required

This handoff was synchronized from
`main@2b83d371bd6913f378fd6b995a787e1848b57e93`. Before any action, resolve the
current 40-character `main` SHA again; do not assume this versioned baseline is
still the default-branch head.

The immediate protected owner sequence is:

1. do **not** dispatch or approve the superseded V18 bounded migration package;
2. review PR #1768 and merge it only after the exact current PR head has all
   required checks successful, an eligible reviewer other than the latest pusher
   has approved that current reviewable head, all conversations are resolved and
   GitHub reports a clean merge state;
3. after the human merge, resolve the new exact `main` SHA and generate fresh V19
   evidence for the selected 25 migrations only;
4. execute the protected real Supabase rehearsal and filtered Production dry run
   for that exact current-main SHA; PR-event contract jobs do not satisfy this
   runtime step;
5. complete the qualified Decision Gate for the exact 25 filenames and SHA-256
   inventory, with no approval or classification carry-forward from V17/V18 or
   another SHA;
6. separately authorize the bounded Production promotion only after rehearsal,
   dry-run, Decision Gate, independent approval and recovery prerequisites are
   accepted for the same exact package;
7. retain post-promotion migration-ledger, schema-drift, RLS/tenant-isolation,
   recovery, Break-Glass, SCIM/integrations and Enterprise Evidence Vault proof
   for that same exact main lineage;
8. execute the remaining protected direct-authority workflows and real-world
   evidence producers for Product FRIA, Billing LIVE, production provider
   runtime, public production/release acceptance, independent pentest and legal
   acceptance before the canonical final authority may emit
   `ENTERPRISE_100: PASS` or `PRODUCTION_GO: PASS`.

Latest read-only Production evidence used to prepare #1768 observed migration
head `20260822120617_atomic_vendor_risk_quota_mutations`. The commercial RPC is
already present under that remote identity; #1768 intentionally does not replay
it in the V19 selected set. The remaining 25 effects require the governed
forward-only path after merge.

No owner action should bypass a required check, fabricate evidence, reuse a
decision or artifact from another SHA, weaken branch/environment protection,
repair migration history without schema proof, perform an unrestricted
production database push, or infer Production success from a pull-request event.
Repository policy in `AGENTS.md` reserves the final merge for a human owner.
