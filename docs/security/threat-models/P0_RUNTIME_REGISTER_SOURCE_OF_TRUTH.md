# Threat model — P0 runtime register source of truth

## Scope

This model covers generation, validation and publication of the exact-SHA P0 runtime evidence register.

## Assets

- canonical P0 control inventory;
- exact assessed repository SHA;
- runtime evidence files;
- repository dependency state;
- generated decision, status and completion percentage;
- owner and next-action metadata;
- artifact integrity digest.

## Trust boundaries

1. Repository source and policy metadata.
2. Runtime evidence produced by protected provider workflows.
3. Pull request and `main` GitHub Actions runners.
4. Uploaded immutable workflow artifacts.
5. Human release and security reviewers.

## Threats and mitigations

### Manual status promotion

**Threat:** An editor changes a Markdown row from `Open` to `Complete` without runtime proof.

**Mitigation:** The policy checker requires every versioned row to remain `Open`. The evaluator and generator ignore Markdown status for completion.

### Stale exact-SHA evidence

**Threat:** Evidence from a prior commit is reused after code changes.

**Mitigation:** Every specialist validator receives the expected 40-character SHA. The generated register is bound to the assessed checkout and rejected on SHA mismatch.

### Placeholder or malformed evidence

**Threat:** A syntactically present file is counted as proof.

**Mitigation:** Runtime status requires canonical validator success, passing outcome and no placeholder-only marker. Missing or invalid JSON fails closed.

### Inconsistent totals or manufactured percentage

**Threat:** Counts are edited so a partial register displays 100% or `GO`.

**Mitigation:** An independent validator recalculates control count, completed count, blocked count, percentage, overall status and decision.

### Unknown or duplicated control

**Threat:** A required control disappears or an attacker adds a harmless duplicate to manipulate totals.

**Mitigation:** Generated controls must match the canonical catalog, remain unique and total 15 or 16 only when the final-runner omission rule applies.

### Dependency state misrepresentation

**Threat:** Repository controls are inherited from a stale status row.

**Mitigation:** Lockfile structure and forbidden dependency specifications are recalculated from the exact checkout.

### Diagnostic injection

**Threat:** Evidence or metadata inserts Markdown rows, multiline content or misleading summaries.

**Mitigation:** Generated Markdown bounds length and strips pipes, backticks and line breaks. JSON remains the canonical machine-readable artifact.

### Secret disclosure

**Threat:** Runtime evidence or provider errors leak credentials into artifacts.

**Mitigation:** Existing specialist validators enforce evidence redaction. The generated register stores paths, bounded failure strings and status metadata rather than raw secret values. `noSecretsStored` is mandatory.

### Artifact tampering

**Threat:** The generated JSON is changed after decision calculation.

**Mitigation:** The generator includes a semantic SHA-256 digest; the independent validator recomputes it. The workflow also publishes file checksums.

### Pull request artifact mistaken for production proof

**Threat:** A feature-branch report is treated as Enterprise production evidence.

**Mitigation:** The artifact records exact SHA and target branch semantics. Production release still requires protected exact-`main` workflows and all specialist runtime proof.

## Residual risks

- A compromised GitHub Actions runner or repository administrator remains a privileged threat.
- Canonical validators can contain defects and require review.
- Independent pentest, legal review and customer acceptance cannot be automated by this register.
- Provider evidence freshness depends on the specialist validator policy.

## Security invariants

- Missing evidence never becomes `Complete`.
- Legacy Markdown status never changes the decision.
- `GO` implies every active control is `Complete` and has zero validator failures.
- Generated evidence is read-only with respect to providers and repository settings.
