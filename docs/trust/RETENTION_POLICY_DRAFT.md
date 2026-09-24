# RISCK COMPLY data retention policy — internal control baseline

Status: `PASS_INTERNAL_POLICY_STRUCTURE / PROVIDER_RETENTION_FACTS_EVIDENCE_BOUND / CONTRACTUAL_PERIODS_NOT_UNIVERSALLY_FIXED`

This internal control baseline defines retention and deletion criteria without inventing fixed periods that are not supported by current provider, legal, accounting, security, contractual or product evidence. It is not a signed customer schedule or legal opinion.

## Retention decision model

RISCK COMPLY uses category-specific criteria instead of one universal retention period. A retention decision must consider:

1. active-service operational need;
2. customer instruction, deletion request or termination state;
3. legal/accounting/tax retention requirements;
4. security, fraud, audit and incident-evidence needs;
5. legal hold or dispute preservation;
6. provider backup/log lifecycle constraints; and
7. the applicable DPA, order form, Terms or negotiated schedule.

Where a provider or agreement does not support a verified fixed period, the customer-safe statement remains criteria-based rather than converting an assumption into a number.

## Internal retention register

| Data category | Active-service posture | Deletion / termination behavior | Provider/downstream boundary |
| --- | --- | --- | --- |
| Account/profile data | Retained while required to operate the authenticated account and service | Subject to approved account/data-subject deletion and applicable preservation duties | Supabase Auth/provider lifecycle must be considered before promising completion timing |
| Organization/workspace data | Retained while the workspace/service relationship requires it | Controlled organization deletion/return process, subject to legal/security exceptions | Database backup lifecycle can outlive the live-row deletion event |
| Controlled documents/storage | Retained while required by product configuration and customer use | Product/storage deletion is recorded where the workflow supports it | Storage object deletion and backup/provider copies are separate evidence questions |
| Audit/security evidence | Retained according to accountability, investigation and security needs | Removed only when the applicable retention basis expires and no preservation duty applies | Tamper-evident hash chain and signed export do not create a claim of external WORM storage |
| Billing/subscription metadata | Retained for service administration and applicable accounting/tax/legal needs | Deletion is subject to mandatory financial-record obligations | Stripe/provider records follow the provider and applicable legal lifecycle |
| Operational/application logs | Retained only as needed for service reliability, security and troubleshooting under configured provider controls | Expires/deletes according to verified provider/account configuration | Do not publish a fixed duration until the actual production provider setting is attributable |
| Error monitoring / analytics | Retained according to enabled production configuration and operational purpose | Governed by the enabled account/project configuration and deletion controls | Provider-specific project attribution, region and retention must be verified before a numeric claim |
| Support/business communications | Retained while needed for the support/business purpose and any applicable legal record duty | Deleted/expired under the applicable mailbox/support retention process | Google Workspace or other operational-provider lifecycle remains account-specific |
| Backups / recovery copies | Retained according to the actual provider backup/recovery configuration | Deleted live data may persist until the relevant backup expires | A backup-expiry statement must be based on current provider/account evidence |
| Legal hold / incident material | Retained for the duration of the valid preservation requirement | Released when the preservation basis ends and normal policy resumes | Exception must be documented and limited to the applicable purpose |

## Deletion principles

- A product deletion event is not represented as instantaneous erasure from every downstream backup, log or provider system.
- Customer/data-subject deletion requests are processed through controlled workflows with authorization and audit evidence where implemented.
- Legal, accounting, security, fraud, incident-response and litigation-preservation duties may delay deletion for the affected records.
- Provider copies expire according to the actual applicable provider/account lifecycle; unverified periods are recorded as account-specific facts pending evidence.
- No synthetic provider fact or guessed retention period may be used in a buyer questionnaire or contract.

## Evidence required before a numeric or contractual commitment

A fixed customer-facing period requires attributable evidence for the relevant category, including as applicable:

1. current production provider/account configuration;
2. signed customer agreement or approved commercial/legal schedule;
3. statutory/accounting retention basis;
4. database/storage/log/backup deletion behavior;
5. downstream provider deletion or expiry behavior; and
6. operational owner/reviewer approval where the control requires it.

## Buyer-safe answer

RISCK COMPLY maintains category-specific retention and controlled export/deletion workflows. Exact contractual durations and downstream provider backup/log lifecycle are stated only where current attributable evidence supports them. Deleted live data may remain in backups or legally preserved records until the applicable lifecycle or preservation requirement ends.
