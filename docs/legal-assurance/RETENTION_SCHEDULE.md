# RISCK COMPLY — Retention Schedule

Date: 2026-09-09  
Status: `DRAFT_FACTUAL_SCHEDULE` · fixed periods are used only where an authoritative source supports them.

This schedule converts the existing operational retention classes into a legal/control register. A statutory accounting/tax retention period is not reused as a blanket retention period for unrelated personal data. Where a fixed period or provider rotation is not supported by evidence or an owner/legal decision, the value remains `BLOCKED` rather than being guessed.

| Data class | Systems/examples | Purpose / basis candidate | Retention trigger | Period / criteria | Deletion/anonymisation | Backup/provider implication | State |
|---|---|---|---|---|---|---|---|
| Account data | local users/profile, auth identity, memberships | service/account administration; contract/security basis subject to final legal-basis map | account/customer relationship ends | active relationship + approved post-termination window | local profile anonymise/delete after review; identity provider handled separately | provider auth retention must be confirmed | BLOCKED_PERIOD |
| Active customer workspace content | organisations, documents, risks, vendors, tasks, notifications, evidence | processor service delivery on customer instructions | termination/customer deletion instruction | active service + approved export/deletion window | delete/anonymise after authorised review unless legal hold applies | forward deletion; expired provider backups age out by verified provider rotation | BLOCKED_EXPORT_WINDOW_AND_BACKUP_FACTS |
| Portuguese accounting / VAT records and supporting documents | invoice/tax records, accounting records and legally required supporting documents | compliance with Portuguese accounting/tax retention obligations | record/transaction according to the applicable fiscal rule | **10 years** for accounting records/supporting documents under CIRC Article 123(4); **10 civil years subsequent** for VAT records/supporting documents under CIVA Article 52(1), subject to the specific counting rule in Article 52(2) where applicable | retain only the records necessary to satisfy the legal obligation; after expiry, delete/minimise unless another lawful basis independently requires retention | Stripe or other provider copies have their own retention and cannot be assumed to satisfy or mirror RISCK COMPLY's legal archive | PASS_STATUTORY_PERIOD |
| Other billing / contract / legal-claim evidence | subscription state, order forms, contract communications, dispute evidence not itself within the accounting/VAT archive | contract administration / establishment, exercise or defence of legal claims | termination, dispute closure or relevant event | do not inherit the 10-year tax period automatically; criterion requires final claims/contract decision | minimise or delete after the applicable purpose/basis expires; preserve only under documented legal hold | provider retention separate | BLOCKED_LEGAL_CLAIMS_CRITERION |
| Security/audit evidence | audit events/logs, denial events, step-up metadata, incident evidence | security/accountability/legal claims | event/incident closure | purpose-based period not yet approved; immutable-chain integrity considerations apply | preserve/minimise/restrict rather than destructive deletion where required for integrity | backups/provider logs must be distinguished | BLOCKED_PERIOD |
| Operational application/edge logs | application/provider logs, rate-limit/security events | debugging, abuse prevention, availability/security | event creation | short operational window; exact provider/app periods not yet proven | expire/anonymise; legal/security hold exception | Vercel/Sentry/Upstash effective retention to verify | BLOCKED_PROVIDER_FACTS |
| Support communications | corporate/support email, attachments, support diagnostics | support/contract administration/legal claims | ticket/conversation closure | approved support/legal period not set | delete/minimise after purpose expires; legal hold exception | Google Workspace/support provider settings to verify | BLOCKED_PERIOD_PROVIDER_FACTS |
| Product analytics, if enabled | PostHog events/identifiers | product improvement under final lawful basis/consent analysis | collection/consent withdrawal/account closure | actual Production retention not confirmed | delete/anonymise according to policy and withdrawal/deletion requirements | recover actual Production project/account first | BLOCKED_CONFIGURATION |
| Security incidents/breach register | incident facts, notification decisions, evidence references | accountability, security, legal obligations/claims | incident closure | purpose/legal period not approved | retain minimum evidence, restrict access, purge when basis expires | evidence providers must follow corresponding schedule | BLOCKED_PERIOD |
| Generated legal/compliance documents | customer-generated/exported documents | processor service delivery | customer deletion/termination | service + approved export/deletion window | delete with workspace data unless separate lawful retention | backups/storage rotation to verify | BLOCKED_EXPORT_WINDOW |

## Authoritative Portuguese retention sources

### CIVA — Article 52

The Portuguese Tax Authority's current consolidated VAT Code states that taxable persons must archive and keep in good order, for the **10 subsequent civil years**, the records and supporting documents covered by Article 52. The current wording reflects Decree-Law 49/2025, effective from 1 July 2025.

Source: Portuguese Tax Authority, `Código do IVA — Artigo 52.º`  
https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva52.aspx

### CIRC — Article 123(4)

The Portuguese Tax Authority's consolidated Corporate Income Tax Code states that accounting books, accounting records and their supporting documents must be kept in good order for **10 years**.

Source: Portuguese Tax Authority, `Código do IRC — Artigo 123.º`  
https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/circ_rep/Pages/irc123.aspx

## Scope boundary for the 10-year rule

The 10-year fiscal/accounting rule closes the retention period only for records that fall within the applicable Portuguese accounting/VAT archive. It does **not** by itself justify keeping:

- ordinary user profiles for 10 years;
- customer workspace content for 10 years;
- product analytics for 10 years;
- support tickets for 10 years;
- operational/security logs for 10 years.

Those categories still require their own purpose, lawful basis, necessity analysis and provider/runtime facts.

## Existing implemented controls

Current repository evidence supports:

- authenticated, tenant-scoped GDPR export;
- RBAC and action-scoped step-up for export/delete-request operations;
- fail-closed audit persistence for sensitive privacy operations;
- delete-request intake with safety delay/manual review;
- retention-class distinction between active customer content, fiscal/legal records, audit/security evidence, logs and backups.

These controls do **not** prove that every downstream provider enforces the same retention period.

## Owner/legal decisions still required

The smallest genuine decisions still needed are:

1. post-termination customer export window;
2. support/corporate communication retention criterion;
3. security/audit evidence retention criterion, consistent with integrity/legal-claims needs;
4. controller-side account retention criterion;
5. legal-claims/contract evidence criterion outside the statutory fiscal archive;
6. whether any customer plan promises a deletion deadline stricter than provider backup rotation permits.

## Terminal state

```text
RETENTION_CLASSES=PASS
RETENTION_TRIGGERS=PASS_PARTIAL
PORTUGUESE_FISCAL_ACCOUNTING_PERIOD=PASS_10_YEARS
RETENTION_FIXED_PERIODS=PARTIAL
PROVIDER_BACKUP_LOG_RETENTION=BLOCKED
RETENTION_ENFORCEMENT=PARTIAL
RETENTION_SCHEDULE=PARTIAL_NOT_FINAL
```

No public or contractual `100% retention readiness` claim is permitted from this schedule.