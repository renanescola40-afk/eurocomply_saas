# Owner action required

The next unavoidable owner actions are:

1. review PR #1730 after all required checks and eligible reviews are green, then
   perform the final merge through normal branch protection;
2. after merge, approve protected environments only for the exact current `main`
   SHA being assessed;
3. execute or approve the required protected direct-authority workflows for that
   exact SHA: Product FRIA QA, Billing + Product LIVE closeout, Supabase Forward
   Production Acceptance, Production Provider Runtime Proof, and External Security
   Assurance Acceptance;
4. complete any separately required legal/release human acceptance before the
   canonical final authority may emit `ENTERPRISE_100: PASS` / `PRODUCTION_GO: PASS`.

No owner action should bypass a required check, fabricate evidence, reuse evidence
from another SHA, or weaken branch/environment protection. Repository policy in
`AGENTS.md` reserves the final merge for a human owner.
