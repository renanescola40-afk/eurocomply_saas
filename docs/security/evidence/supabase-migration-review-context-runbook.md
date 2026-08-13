# Migration review context runbook

1. Run the protected `Supabase Production Migration Dry Run` against the exact current `main` SHA with `DRY_RUN_ONLY`.
2. The complementary `Supabase Migration Review Context` workflow runs after the dry-run completes for trusted `main` only.
3. Review `migration-review-context.json` together with the original reconciliation batches.
4. Treat catalog-name matches only as triage evidence. Review the complete SQL before selecting any migration classification.
5. Do not repair migration history or deploy pending migrations until the independent review and protected reconciliation gates are satisfied.

A blocked dry-run remains a blocked deployment. The enrichment workflow never converts it to a deployment authorization.