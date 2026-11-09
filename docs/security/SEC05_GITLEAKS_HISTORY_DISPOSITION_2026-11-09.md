# SEC-05 — Historical Gitleaks fixture disposition (2026-11-09)

Status: Proposed for independent security review. This is not an Enterprise gate acceptance.

## Context

On exact PR source SHA \`ca9d349eac56201b6f39e99d1da1adda38f2e71a\`, GitHub Actions Gitleaks scanned 18,175 commits and reported six historical matches, while the current source worktree scanner had already passed. We obtained the GitHub Actions provider report \`gitleaks-history-metadata\` from run \`42717923314\` using a metadata-only artifact that deliberately omits Secret, Match and Fingerprint content.

All six matches use only custom rule \`risck-comply-public-env-sensitive-name\`. They appear in a negative-test fixture \`tests/security/client-env-access.test.mjs\` or decision note \`docs/decisions/2026-11-03-sec05-client-env-guard.md\`, across immutable commits \`77c597fb80c806f8d7492bc6e2d97b688a0574b9\`, \`a00bed55bf285ac8135e0e7e066f96fd1fa90e84\`, \`d36f4493855bc7b4ec2b874cf52cb04303acfcc3\` and \`f6abcc43ac76f355e8879e8c24ad5d536f5eab26\`. Existing source commits and PR #2631 establish that these are synthetic forbidden-public-name tests/documentation, not values from Stripe, Supabase or GitHub. The report contains no matches from the custom provider key-like value rule.

## Proposed disposition

Append exactly six commit-specific \`.gitleaksignore\` fingerprints (commit, file, rule, original line) to acknowledge those immutable old synthetic matches. Never add file-wide, rule-wide, global, wildcard, or token-value exceptions. Preserve the original Gitleaks CLI, SHA-256 verification, entire-history scan, strict exit-on-finding, and the previous seven separately recorded ignore entries.

This does **not** prove that the public Git history contains no credentials under other patterns, or resolve any separately detected exposure. A fresh exact-SHA history scan must complete with zero *untriaged* findings. The exemption itself requires qualified independent review.

## Risks and rollback

An incorrect fingerprint could suppress a genuine finding in one historical commit. Mitigation: immutable SHA/file/rule/line matching, provider artifact provenance and independent diff inspection. If review finds a non-synthetic match, remove the relevant fingerprint immediately and treat the incident as an exposure, including credential revocation/rotation where applicable.

Rollback through a governed PR removes only the six added fingerprints; do not disable Gitleaks or rewrite public Git history without a separate incident-response decision. No Production, Stripe LIVE, billing or deployment change is authorized here.
