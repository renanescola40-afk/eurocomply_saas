# Owner action required

Current synchronized baseline before this evidence PR:
`main@75151c463ea7bf54c74e4dc9e5cd3af995615eae`.

Resolve the current 40-character `main` SHA again immediately before any runtime
action; never assume this versioned handoff remains the default-branch head.

## Next unavoidable owner action

The immediate P0 is #1814. The existing Vercel Production deployment is `READY`
and bound to current main, but the project reports `live=false` and
`https://risckcomply.com/api/health` returns HTTP `402 DEPLOYMENT_DISABLED`.

Vercel's documented zero-cost first remediation is to **unpause the existing
project**. The connected Vercel tool surface available to this execution does not
expose the authenticated `unpause` mutation or a generic REST write, so this is
the next unavoidable account-level owner action.

Owner sequence:

1. open the existing `eurocomply-saas` project in the existing Vercel Pro team;
2. use the project **Unpause / Restore** action if it is offered without a plan,
   billing or commercial change;
3. do **not** upgrade, purchase capacity, accept an invoice, change provider,
   create a new account or create a new company as part of this action;
4. if Vercel requires payment, plan change or another commercial commitment,
   stop without accepting it and return the exact prompt/error for owner decision;
5. after a zero-cost unpause succeeds, re-run canonical `/api/health` and require
   HTTP `200` before any Production-health claim;
6. rebind Production/runtime/provider evidence to the exact serving `main` SHA;
7. only then continue the separately governed Supabase #1631 protected sequence
   if and when explicit Production-write authorization exists.

## Already superseded

- PR #1768 is merged and is not an active owner merge task.
- Issue #1778 is closed via merged #1780 and is not a current schema/runtime
  compatibility blocker.
- Vercel Hobby and Supabase Free plan mismatches are closed; the current Vercel
  problem is serving state, not evidence that the connected team reverted to
  Hobby.

## Separate protected decisions still open

Restoring Vercel availability does **not** authorize:

- Supabase Production DDL or migration promotion;
- migration-history repair or unrestricted `db push`;
- provider/legal/DPA acceptance;
- independent pentest execution;
- paid legal or security engagement;
- synthetic Stripe customer/payment evidence;
- `ENTERPRISE_100: PASS` or `PRODUCTION_GO: PASS`.

Repository policy in `AGENTS.md` reserves final PR merge for a human owner after
exact-head checks, independent eligible approval, resolved conversations and a
clean merge state.
