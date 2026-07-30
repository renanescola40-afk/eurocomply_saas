# Security Control Map

## Purpose

This map links security engineering controls to legal-review questions. It is evidence preparation, not certification or an external security opinion.

| Control area | Repository control | Legal/privacy relevance | Required final evidence |
|---|---|---|---|
| Authentication | Supabase Auth, server-side `getUser()` validation | identity integrity and access lawfulness | exact-SHA auth smoke and provider configuration |
| Tenant isolation | organisation membership, RLS, server guards | confidentiality and controller/processor obligations | live cross-tenant denial evidence |
| RBAC | owner/admin/member and specialised roles | least privilege and reviewer independence | permission matrix and negative tests |
| API authorization | BOLA/tenant/resource guards | unauthorised access prevention | route-contract and runtime evidence |
| Input validation | Zod, bounded request bodies | data minimisation and abuse prevention | tests for invalid/oversized payloads |
| No-store | private routes and sensitive APIs | cache confidentiality | header tests and production capture |
| Trusted origin | origin/CSRF protections | unauthorised state-change prevention | production trusted-origin validation |
| Rate limits | distributed/local controls | availability and abuse prevention | configured production evidence |
| Audit logs | security and business events | accountability and evidence integrity | exact-SHA audit-chain evidence |
| Step-up/MFA | sensitive-operation gates | higher assurance for critical actions | live step-up evidence |
| Secrets | environment variables and secret scans | confidentiality and processor security | production secret-readiness gate |
| Upload security | limits, file naming and scanning | malware and content-risk control | scanner runtime validation |
| Observability | sanitised logs/Sentry support | incident detection without excess PII | active configuration and scrubbing evidence |
| Incident response | runbooks, health/readiness, release gates | breach and service-incident response | tested incident/rollback evidence |
| Billing integrity | server Stripe flows and webhook verification | contract and payment accuracy | live/test webhook evidence |
| Review confidentiality | private storage, signed URLs, scoped reviewer access | confidentiality, privilege and professional secrecy | implemented portal/storage evidence |

## Qualified-review specific controls

A review record must not receive `COUNSEL_ACCEPTED` status unless all of the following are proven:

- real reviewer identity and professional registration;
- qualification scope and evidence reference;
- independence and conflict assessment;
- defined included and excluded scope;
- exact product/source SHA;
- evidence-package integrity digest;
- current legal-source references;
- decision, limitations and required changes;
- validity period;
- signed-artifact reference and decision digest;
- private storage and controlled access.

## Confidentiality rules

- Do not commit confidential advice or unredacted reviewer documents to a public repository.
- Do not log legal documents, tokens or unnecessary personal data.
- Use organisation-scoped private storage and expiring signed URLs.
- Record access, download, revocation and deletion events.
- Do not submit confidential legal material to an AI provider unless contractual data-use, retention and training restrictions are verified.

## Open security/legal decisions

- final production regions and subprocessors;
- retention and deletion periods;
- legal hold process;
- reviewer portal privilege/confidentiality labels;
- incident notification commitments that operations can reliably meet;
- external assurance or conformity procedures required for particular customers.
