# User profile runtime coverage gap

Status: Open.

The final evidence checker now requires runtime `profiles` coverage before accepting a passing runtime evidence file. The remaining implementation gap is in `scripts/security/run-supabase-live-tenant-isolation-v2.mjs`: the setup loop still skips `profiles`, so the runner cannot yet emit the required `profiles` runtime test cases.

Required next code change:

- Add a `profiles` table spec seeded with the tenant B user id.
- Use an existing tenant A viewer user id as the denied insert target.
- Stop skipping `profiles` in the setup seed loop.
- Run the live validation workflow against the configured project.
- Commit the generated evidence only when it is `Complete` / `passed`.
