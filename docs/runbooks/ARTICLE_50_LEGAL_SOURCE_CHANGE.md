# Article 50 Legal Source Change Runbook

## Trigger

Use this runbook when an Official Journal act, Commission guideline, adequacy decision or final code-of-practice development may change Article 50 dates, scope, wording or evidence expectations.

## Procedure

1. Record the official source URL, authority, publication date, access date and digest.
2. Confirm whether the source is binding law, guidance, code, draft or political agreement.
3. Do not change the effective-date resolver from a press release or FAQ alone.
4. Obtain the exact entry-into-force and transitional provisions from the final act.
5. Add a versioned rule and boundary tests before changing customer-facing labels.
6. Re-run the Article 50 control-plane workflow and the canonical product coverage generator.
7. Invalidate prior decisions only where the new rule expressly requires re-evaluation; preserve historical snapshots.
8. Generate new staging/runtime evidence against the exact deployment SHA.
9. Re-open the qualified Article 50 review when wording, scope, dates or material translations change.
10. Promote only after technical gates pass and the required human review remains accurately represented.

## Rollback

If a legal-source update was applied incorrectly:

- revert the rule and customer-facing label change;
- restore the last verified source version;
- mark affected decisions stale;
- notify control owners;
- regenerate exact-SHA evidence;
- document impact and corrective action.

## Prohibited shortcuts

- treating a proposal as adopted law;
- using a commercial blog as primary authority;
- applying a provider transition to deployer duties;
- counting an empty template as evidence;
- retaining a `READY` result after its rule version becomes stale;
- inventing reviewer identity or approval.
