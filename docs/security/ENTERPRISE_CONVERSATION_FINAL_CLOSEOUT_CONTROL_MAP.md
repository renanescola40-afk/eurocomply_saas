# Enterprise Conversation Final Closeout Control Map

| Control | Implementation | Evidence |
|---|---|---|
| Exact release identity | Full 40-character SHA validation and current-main comparison | Closeout result `releaseSha` |
| Stripe runtime proof | At least one passing exact-SHA Stripe evidence artifact | `required.stripeRuntime` |
| Enterprise runtime proof | Passing exact-SHA enterprise runtime evidence | `required.enterpriseRuntime` |
| Production-final proof | Passing exact-SHA production-final evidence | `required.productionFinal` |
| Human release decision | Passing exact-SHA Go/No-Go evidence | `required.releaseGoNoGo` |
| Fail-closed completion | Non-zero exit while any blocker remains | Workflow failure and `blockers` |
| Integrity | SHA-256 digest over the closeout result | `sha256` and `SHA256SUMS` |
| Protected execution | GitHub protected `production` environment | Workflow run provenance |
| Least privilege | Workflow `contents: read` only | Workflow definition |
| Retention | Immutable artifact retained for 365 days | GitHub Actions artifact metadata |

The control map does not treat merge, CI success or Vercel success alone as proof of full conversation completion.
