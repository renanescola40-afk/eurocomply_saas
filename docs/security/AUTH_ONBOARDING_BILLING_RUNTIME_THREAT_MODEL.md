# Auth, onboarding and billing runtime proof threat model

## Assets

- Supabase database credentials and connection string;
- organization and subscription identifiers;
- Stripe event identifiers;
- tenant onboarding and billing state;
- chained audit evidence;
- release SHA and workflow provenance.

## Trust boundaries

1. GitHub workflow dispatcher and protected environment approval;
2. GitHub-hosted runner;
3. PostgreSQL TLS connection to the target Supabase project;
4. temporary raw observation inside the runner workspace;
5. retained sanitized GitHub artifact.

## Threats and controls

### Stale or substituted release

**Threat:** evidence is collected for code that is not the current `main` release.

**Controls:** full SHA input, checkout of trusted `main`, fetch of `origin/main`, equality checks for input SHA, checked-out HEAD and current main.

### Unauthorized target selection

**Threat:** an operator probes an arbitrary organization.

**Controls:** protected GitHub environment, explicit manual confirmation, bounded UUID/event/plan validation, documented pre-authorization requirement and repository read-only permissions.

### SQL injection through inputs

**Threat:** workflow inputs alter the SQL command.

**Controls:** strict input formats, environment variables rather than command interpolation, psql variables and `:'name'` SQL literal quoting, no dynamic identifiers.

### Database mutation

**Threat:** the proof changes production state while collecting evidence.

**Controls:** SQL contains only catalog and row `SELECT` operations; the workflow has no migration, RPC mutation or repository write step; contract tests assert read-only design.

### Credential or tenant-data leakage

**Threat:** connection strings, service-role credentials or full identifiers are retained in artifacts.

**Controls:** connection string is an environment secret, raw observation is removed before upload, evidence stores identifier suffixes only, artifact scanning rejects secret-like patterns, validator rejects UUIDs and full `evt_...` identifiers.

### False onboarding proof

**Threat:** a boolean variable or operator assertion is accepted as evidence that onboarding worked.

**Controls:** direct database observation of organization state, completed activation run, selected plan and atomic activation RPC. No `*_VALIDATED=true` input can satisfy these controls.

### False billing proof

**Threat:** a subscription row exists but is inactive, unbound or inconsistent with entitlements.

**Controls:** active/trialing status, canonical plan/tier equality, Stripe customer/subscription binding and non-empty entitlement object are all independently required.

### Replayed or failed Stripe event credited

**Threat:** a failed or unrelated event is used as evidence.

**Controls:** exact event correlation, organization correlation, `processed` status, null error and non-null processing timestamp.

### Fabricated or broken audit evidence

**Threat:** application state changes without a valid chained audit record.

**Controls:** three required action records, SHA-256 event hashes and predecessor-link resolution against the same organization ledger.

### Artifact editing or overclaiming

**Threat:** a failed artifact is manually presented as complete.

**Controls:** deterministic builder, source digest, fail-closed validator, exact schema and evidence-item identifiers, all required checks must be literal `true`, failures array must be empty.

## Residual risks

- the proof observes one authorized organization, not all tenants;
- a successful observation is point-in-time and does not guarantee future releases;
- GitHub and Supabase control-plane compromise are outside this repository's direct control;
- the proof does not validate payment settlement, refunds, tax state or legal compliance;
- database administrators can alter underlying state and therefore remain privileged trust actors.

## Security decision

The proof may support technical runtime acceptance only when it is green for the exact current SHA and the retained artifact passes the validator. It must not be represented as certification, universal tenant proof or legal approval.
