# Control Map — Enterprise Conversation Runtime Closeout

| Control | Implementation | Evidence |
|---|---|---|
| Exact release identity | Current `main` SHA authorization | Workflow log and final JSON |
| Stripe runtime | Mandatory source artifact | Source digest in final JSON |
| Enterprise runtime | Mandatory source artifact | Source digest in final JSON |
| Production validation | Mandatory source artifact | Source digest in final JSON |
| Human Go/No-Go | Mandatory source artifact | Source digest in final JSON |
| Fail-closed decision | Non-empty blockers keep status Open | Assessor output |
| Approval boundary | Protected `production` environment | GitHub deployment review |
| Integrity | SHA-256 final artifact | `SHA256SUMS` |
| Retention | 365-day artifact | GitHub Actions artifact metadata |
