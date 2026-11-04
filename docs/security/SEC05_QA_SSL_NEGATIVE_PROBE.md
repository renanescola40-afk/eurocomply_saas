# SEC-05 — QA-only PostgreSQL cleartext negative probe

The owner reported the SSL enforcement toggle remained ON after refreshing isolated QA on 2026-11-04. Supabase QA SQL remained healthy on TLS 1.3. The dashboard report and current-session TLS **do not by themselves prove that new cleartext clients are refused**.

Run only from an existing authorized test runner with network reachability to the QA direct database hostname:

```sh
node --test tests/security/sec05-qa-nontls-probe.test.mjs
node scripts/security/sec05-qa-nontls-probe.mjs
```

The second command is an **unauthenticated one-time protocol startup probe**, not a password check, SQL query, database write, production test, or migration. It is restricted to `db.zrxrrfbllsxtleyxjpsz.supabase.co:5432`. No credentials, IPs, database errors, or customer data are printed. It returns `EXPLICIT_NON_TLS_REJECTION` only when the database responds with an explicit encryption-requirement error. `NON_TLS_REACHED_AUTH` requires investigation. `INCONCLUSIVE` means do not claim a successful security test (e.g. DNS failure, network restriction, or unrecognized response). A proxy could affect the results, and the unauthenticated response is not cryptographically authenticated; corroborate it with Supabase management settings, health and a trusted network environment.

The local isolated verifier tests passed 7/7 on Node 22.16.0 on 2026-11-04, but the real QA probe from the isolated ChatGPT runtime returned `INCONCLUSIVE` because QA DNS resolution was unavailable. Do not treat the mock server test as live QA proof or declare gate A-04 / SEC-05 accepted until all other required evidence and qualified review are complete. No production mutations or costs authorized.
