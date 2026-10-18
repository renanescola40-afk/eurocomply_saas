# Enterprise recovery preflight — mobile operator handoff

**Status:** PREPARATION ONLY. This workflow does not produce a backup or prove recoverability.

## Safety boundary

- This PR must not be merged during an exact-SHA production freeze without release-controller approval.
- GitHub `workflow_dispatch` requires the workflow file on the repository's default branch to be discoverable for manual dispatch. A draft PR alone cannot be run through the Actions UI.
- Never enter a database URL, password, API key, dump, or tenant data in an issue, PR, chat, command input, or Actions workflow_dispatch field.
- This workflow uses a GitHub environment named `enterprise-recovery`. Configure it with appropriate reviewers and secrets before merging or running; environment protection options depend on repository visibility and plan.
- Check available Actions minutes and charges before starting. No execution is authorized if it could incur charges.
- Set `RISCK_BACKUP_DATABASE_URL` as a **GitHub environment secret**, not a repository file. Use a dedicated least-privilege PostgreSQL role with TLS verification. This secret is required for preflight only; a full backup requires a separately approved, properly privileged credential.
- Restrict any temporary credential to the duration of the test; rotate it afterward.
- The workflow deliberately produces no backup and stores no output artifacts.

## From an iPhone (after approval)

1. Open the repository in Safari, request desktop website if needed.
2. Under **Settings → Environments**, create `enterprise-recovery` and configure protection/approval as available. Add the environment secret `RISCK_BACKUP_DATABASE_URL` there. Never copy its value into chat.
3. Confirm Actions usage and billing limits. Do not run if the free allowance is exhausted.
4. After the reviewed workflow is present on `main`, open **Actions → Enterprise recovery preflight → Run workflow**. Enter exactly `PREFLIGHT_ONLY`.
5. Inspect only PASS/FAIL status. Do not copy logs containing accidental credentials.
6. If PASS, do **not** apply migrations or promote production yet. First obtain an encrypted, restorable backup with verified isolated restore and a tested rollback plan.

## Acceptance

- [ ] No extra charge or Actions overage
- [ ] GitHub environment protections reviewed
- [ ] Dedicated database credential provisioned securely
- [ ] Preflight run succeeds on the intended project
- [ ] PostgreSQL version and TLS verified
- [ ] Independently tested restorable backup available
- [ ] Restore evidence reviewed
- [ ] Recovery time and rollback evidence reviewed

**Important:** `pg_dump` logical dumps do not by themselves capture every Supabase-managed service, storage object, secret, or global database role. Recovery acceptance must explicitly cover the chosen recovery perimeter.
