# Restore Drill Threat Model

## Assets

- production backup confidentiality;
- tenant isolation;
- authentication and authorization boundaries;
- migration and schema integrity;
- recovery evidence integrity;
- provider credentials;
- exact-SHA release provenance.

## Primary threats and mitigations

| Threat | Mitigation |
| --- | --- |
| Restore target accidentally becomes public | Isolated-target assertion, no production traffic, stop condition and independent approval |
| Production jobs send email or webhooks from restored data | Explicit job, webhook and outbound-communication shutdown before smoke testing |
| Stale evidence is reused for a newer release | Exact current-main SHA comparison through GitHub API |
| Artifact comes from another repository or failed run | Same-repository provenance and successful-run enforcement |
| Secrets enter retained evidence | Forbidden key/value scan and sanitized hash-only identifiers |
| Incomplete drill is marked Complete | Ten mandatory checks must all be true |
| Operator self-approves | Independent approver role and independence assertion |
| Cross-tenant access exists in restored environment | Mandatory synthetic tenant-isolation verification |
| Production is changed during the exercise | `productionMutationPerformed` must be false |
| Raw customer data is retained as evidence | Aggregate-only verification and one sanitized JSON artifact |
| Evidence is altered after approval | SHA-256 digest in the promoted artifact |
| Cleanup is skipped | `cleanupVerified` is mandatory before promotion |

## Residual risks

The repository cannot independently prove that provider-side actions occurred. The protected environment approver must review the provider record, operator notes and source workflow provenance. External security review remains required for high-assurance procurement claims.
