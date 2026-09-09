# RISCK COMPLY — Retention Schedule

Date: 2026-09-09  
Status: `DRAFT_FACTUAL_SCHEDULE` · no invented fixed periods.

This schedule converts the existing operational retention classes into a legal/control register. Where a fixed period or provider rotation is not yet supported by evidence or an owner/legal decision, the value remains `BLOCKED` rather than being guessed.

| Data class | Systems/examples | Purpose / basis candidate | Retention trigger | Period / criteria | Deletion/anonymisation | Backup/provider implication | State |
|---|---|---|---|---|---|---|---|
| Account data | local users/profile, auth identity, memberships | service/account administration; contract/security basis subject to final legal-basis map | account/customer relationship ends | active relationship + approved post-termination window | local profile anonymise/delete after review; identity provider handled separately | provider auth retention must be confirmed | BLOCKED_PERIOD |
| Active customer workspace content | organisations, documents, risks, vendors, tasks, notifications, evidence | processor service delivery on customer instructions | termination/customer deletion instruction | active service + approved export/deletion window | delete/anonymise after authorised review unless legal hold applies | forward deletion; expired provider backups age out by verified provider rotation | BLOCKED_EXPORT_WINDOW_AND_BACKUP_FACTS |
| Billing/tax/legal records | subscriptions, billing metadata, invoice/tax references | contract, accounting/tax/legal claims | transaction/contract termination | statutory/business retention not yet fixed in this register | preserve minimum required; delete/minimise when basis expires | Stripe/provider retention separate | BLOCKED_LEGAL_PERIOD |
| Security/audit evidence | audit events/logs, denial events, step-up metadata, incident evidence | security/accountability/legal claims | event/incident closure | purpose-based period not yet approved; immutable-chain integrity considerations apply | preserve/minimise/restrict rather than destructive deletion where required for integrity | backups/provider logs must be distinguished | BLOCKED_PERIOD |
| Operational application/edge logs | application/provider logs, rate-limit/security events | debugging, abuse prevention, availability/security | event creation | short operational window; exact provider/app periods not yet proven | expire/anonymise; legal/security hold exception | Vercel/Sentry/Upstash effective retention to verify | BLOCKED_PROVIDER_FACTS |
| Support communications | corporate/support email, attachments, support diagnostics | support/contract administration/legal claims | ticket/conversation closure | approved support/legal period not set | delete/minimise after purpose expires; legal hold exception | Google Workspace/support provider settings to verify | BLOCKED_PERIOD_PROVIDER_FACTS |
| Product analytics, if enabled | PostHog events/identifiers | product improvement under final lawful basis/consent analysis | collection/consent withdrawal/account closure | actual Production retention not confirmed | delete/anonymise according to policy and withdrawal/deletion requirements | recover actual Production project/account first | BLOCKED_CONFIGURATION |
| Security incidents/breach register | incident facts, notification decisions, evidence references | accountability, security, legal obligations/claims | incident closure | purpose/legal period not approved | retain minimum evidence, restrict access, purge when basis expires | evidence providers must follow corresponding schedule | BLOCKED_PERIOD |
| Generated legal/compliance documents | customer-generated/exported documents | processor service delivery | customer deletion/termination | service + approved export/deletion window | delete with workspace data unless separate lawful retention | backups/storage rotation to verify | BLOCKED_EXPORT_WINDOW |

## Existing implemented controls

Current repository evidence supports:

- authenticated, tenant-scoped GDPR export;
- RBAC and action-scoped step-up for export/delete-request operations;
- fail-closed audit persistence for sensitive privacy operations;
- delete-request intake with safety delay/manual review;
- retention-class distinction between active customer content, billing/legal records, audit/security evidence, logs and backups.

These controls do **not** prove that a fixed legal retention period is correct or that every downstream provider enforces it.

## Owner/legal decisions required

The smallest genuine decisions still needed are:

1. post-termination customer export window;
2. support/corporate communication retention criterion;
3. security/audit evidence retention criterion, consistent with integrity/legal-claims needs;
4. controller-side account retention criterion;
5. billing/tax retention based on applicable Portuguese obligations;
6. whether any customer plan promises a deletion deadline stricter than provider backup rotation permits.

## Terminal state

```text
RETENTION_CLASSES=PASS
RETENTION_TRIGGERS=PASS_PARTIAL
RETENTION_FIXED_PERIODS=BLOCKED
PROVIDER_BACKUP_LOG_RETENTION=BLOCKED
RETENTION_ENFORCEMENT=PARTIAL
RETENTION_SCHEDULE=BLOCKED_FOR_FINAL
```

No public or contractual `100% retention readiness` claim is permitted from this schedule.