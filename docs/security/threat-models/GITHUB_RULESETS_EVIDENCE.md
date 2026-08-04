# Threat Model — GitHub Rulesets Platform Evidence

## Asset

The asset is the decision that `main` is protected strongly enough to contribute runtime credit to the Enterprise closeout scorecard.

A false positive could allow an unreviewed, unchecked, force-pushed or deletable branch to be represented as protected.

## Trust boundaries

- GitHub Actions runner;
- canonical repository metadata APIs;
- optional read-only repository-control token;
- current `main` reference;
- classic branch-protection endpoint;
- repository and inherited rulesets endpoints;
- generated JSON evidence artifact;
- downstream evidence validator and scorecard.

## Threats and mitigations

### Stale SHA substitution

**Threat:** evidence is generated for a commit that is no longer current `main`.

**Mitigation:** target SHA, checked-out SHA and GitHub-reported current-main SHA must be full 40-character hashes and identical.

### API-source downgrade

**Threat:** a classic API failure is interpreted as proof that protection exists.

**Mitigation:** API failure alone never passes. The fallback must independently prove equivalent active rulesets.

### Evaluate-mode confusion

**Threat:** a ruleset in non-enforcing evaluation mode is counted as active protection.

**Mitigation:** only `enforcement: active` is accepted.

### Wrong-ref projection

**Threat:** a ruleset protecting another branch or tag is counted for `main`.

**Mitigation:** target must be `branch`; include and exclude conditions are evaluated against `refs/heads/main` and `~DEFAULT_BRANCH`.

### Cumulative-policy omission

**Threat:** controls split across several rulesets are evaluated individually and appear incomplete or, conversely, one strong rule masks another weak requirement.

**Mitigation:** all active applicable rulesets are projected cumulatively, then the canonical complete policy is evaluated once.

### Bypass actor concealment

**Threat:** administrators, integrations or roles can bypass the rules while the evidence reports complete enforcement.

**Mitigation:** every applicable bypass actor causes fail-closed evidence. Only sanitized actor type and bypass mode are retained.

### Required-check alias drift

**Threat:** renamed checks silently disappear from protection.

**Mitigation:** canonical checks and approved aliases are evaluated by the existing branch-protection policy engine. Missing checks remain explicit.

### Raw metadata or token leakage

**Threat:** the workflow artifact stores access tokens, raw API responses, user data or internal identifiers unnecessarily.

**Mitigation:** only a bounded sanitized projection is persisted. Tokens and raw payloads are never written.

### Workflow mutation

**Threat:** an evidence job modifies repository policy to make itself pass.

**Mitigation:** workflow permissions remain `contents: read`, checkout credentials are not persisted and the builder has no write API path.

### Pull-request secret exposure

**Threat:** untrusted pull-request code accesses protected tokens.

**Mitigation:** pull requests execute contract tests only. The protected runtime proof runs only on `push` to `main` or manual dispatch under the `Production` environment.

## Residual risks

- GitHub API semantics may evolve;
- inherited organization rulesets may require additional API permissions;
- a repository administrator may change controls immediately after evidence generation;
- GitHub service integrity is outside the repository's control;
- evidence does not prove reviewer independence or deployment approval.

These risks require freshness limits, protected execution, retained provenance and rerunning the proof for every release SHA.
