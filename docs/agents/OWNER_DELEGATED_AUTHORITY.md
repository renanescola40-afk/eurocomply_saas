# RISCK COMPLY — Owner-delegated operating authority

Owner direction recorded 2026-10-16: grant coding agents broad delegated engineering authority to investigate, create, change, review, prepare merges and operate across the codebase; outbound email remains prohibited without specific prior owner authorization.

## Authorized without repeated owner confirmation
- Read code, configuration, repository policies, PRs, CI, relevant provider logs and redacted evidence.
- Create branches, files, commits, test fixtures, issues, plans, PRs and documentation.
- Implement and validate non-destructive changes; coordinate specialized reviews; resolve review comments in own code; prepare rollout/rollback.
- Perform bounded read-only production investigations, without exposing sensitive content or stressing production.

## Release and approval limits
- This document does not issue GitHub IAM credentials, confer legal account ownership, start agent processes or override repository rules.
- Existing AGENTS.md and docs/ENGINEERING_CONSTITUTION.md remain authoritative. Only an eligible independent human reviewer can supply required PR approval. Final merge requires human owner action unless [DELEGATED_MERGE_POLICY.md](DELEGATED_MERGE_POLICY.md) has been human-accepted and separately activated for the actual interactive operator and PR scope. Agents cannot self-approve, auto-merge or bypass protections; existing classifier/autofix automation remains human-only.
- Production deployments, destructive schema/data changes, live billing, security reductions, new providers, paid services, credentials and material risk acceptance remain subject to applicable safety/approval gates and specifically scoped execution authorization.
- No outbound emails or other external messages without explicit owner approval of content and recipient. Internal GitHub PR/issue comments are permitted as development records.
- Do not interrupt protected demos, expose secrets or personal data, fabricate checks, or report TESTED/DEPLOYED/PASS without actual evidence.

## Conditional future expansion
The bounded delegated merge amendment must itself follow the previously effective human-review and human-final-merge rules. It does not change branch protection or activate any operator. An explicit activation record and effective provider protections are separate prerequisites. Until these are verified, prepare merges for the human owner. Never silently rewrite controls or equate the owner's chat instruction with a GitHub status review.

## Proof of activation
Record selected runtime, authenticated principal, scopes, costs, exact SHA, run logs, CI results and approvals before declaring agents operational. New files alone are only profiles/instructions.
