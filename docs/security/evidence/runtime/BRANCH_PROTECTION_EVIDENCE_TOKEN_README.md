# Branch protection evidence token

The `P0 Branch Protection Evidence` workflow reads GitHub branch protection metadata for `main` and writes a generated evidence artifact.

GitHub may return `Resource not accessible by integration` when the default `GITHUB_TOKEN` cannot read branch protection settings. In that case, the workflow now still uploads an `Exception` evidence artifact instead of failing before artifact upload.

To generate `Complete` evidence, configure repository branch protection/rulesets to match `docs/security/BRANCH_PROTECTION_REQUIRED_RULES.md` and add a repository secret named `BRANCH_PROTECTION_READ_TOKEN` if the default token cannot read branch protection metadata.

Recommended token shape:

- Fine-grained GitHub token
- Repository: `renanescola40-afk/eurocomply_saas`
- Read-only access where possible
- Permissions sufficient to read repository administration / branch protection metadata
- No write permission required

Do not mark `docs/security/evidence/runtime/branch-protection-required-checks.json` as `Complete` unless the generated artifact or administrator screenshot evidence proves the required settings.
