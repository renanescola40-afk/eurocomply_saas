# Public production Go/No-Go evidence

The public production release profile fails closed and records its final decision in
`docs/security/evidence/runtime/release-go-no-go.json`.

The decision is generated only after `production-final-validation.json` exists. The
final runner therefore does not consume its own Go/No-Go output as a prerequisite.
The public dispatcher performs this order:

1. validate the public production environment;
2. run the final public production validation;
3. generate the public Go/No-Go decision;
4. validate the decision against the exact release commit, build, and target;
5. finalize security-response evidence.

The public decision requires Complete/passed evidence for:

- public production environment readiness;
- deployment and observability smoke;
- non-destructive rollback dry-run;
- Supabase live RLS isolation;
- branch protection required checks;
- public production final validation.

Environment readiness, deployment smoke, rollback, Supabase RLS, and final validation
are commit-bound. A missing, malformed, failed, or stale artifact produces No-Go.
Observability and branch-protection proofs are required but are not commit-bound
because they validate target/runtime configuration and repository policy.

Run the standalone fail-closed gate with:

```bash
RELEASE_TARGET=public-production \
RELEASE_COMMIT_SHA=<40-character-sha> \
RELEASE_BUILD_SHA=<40-character-sha> \
npm run release:public-go-no-go-evidence
```

The generated decision stores no provider URL, DSN, token, cookie, Authorization
header, secret value, or customer data. Enterprise-only evidence remains governed by
the separate Enterprise Go/No-Go writer and validator.
