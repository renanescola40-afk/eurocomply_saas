# Fail closed when document signed-URL audit persistence is unavailable

- Status: Proposed
- Date: 2026-07-18
- Scope: Document download and preview signed-URL server actions
- Severity: P1

## Context

The document access action verifies authentication, organization membership, `documents:read` permission, tenant-scoped storage paths, and a fail-closed distributed rate limit before asking the storage provider for a short-lived signed URL.

After the provider returned the URL, the action wrote `document.download_url_created` but did not inspect the audit writer's explicit `persisted` result. A failure in the durable audit chain could therefore still disclose a bearer-style URL that grants temporary access to a controlled document.

This decision does not claim that the storage provider can revoke an already generated URL. The security boundary is that an URL which has not yet been returned to the caller remains undisclosed.

## Decision

Require `logAuditEvent(...).persisted === true` before returning either a download or preview signed URL.

When persistence is unavailable:

1. report sanitized operational context;
2. return no signed URL to the caller;
3. raise the existing generic server-action error `Document access is temporarily unavailable`;
4. keep all existing authentication, tenant, permission, storage-path, expiry, and rate-limit controls unchanged.

## Impact

Successful signed-URL responses now have durable audit-chain evidence. During an audit subsystem outage, document download and preview availability is intentionally reduced rather than disclosing controlled content without accountability evidence.

The storage provider may still have generated a short-lived URL internally, but the application does not expose it. The URL expires according to `SIGNED_DOCUMENT_URL_EXPIRES_IN_SECONDS`.

## Risks

- Audit-chain incidents can temporarily block legitimate document access.
- The generated but undisclosed URL cannot currently be proactively revoked.
- Static regression coverage proves source-level ordering and retained controls; it is not runtime evidence, a penetration test, or proof of production configuration.

## Tests and evidence

`tests/security/document-signed-url-audit-fail-closed.test.ts` asserts that:

- the audit result is captured;
- persistence is checked before the signed URL is returned;
- tenant filtering, `documents:read`, tenant storage-path validation, fail-closed rate limiting, and bounded URL expiry remain present.

Merge requires all required exact-head CI, lint, typecheck, test, build, security, dependency, secret-scanning, enterprise-readiness, and release checks to pass.

## Rollback

Revert the commits in this pull request. That restores the previous availability behavior, where a signed URL could be returned despite failed durable audit persistence. No schema or data migration is introduced.
