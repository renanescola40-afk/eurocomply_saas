# RISCK COMPLY — Record of Processing Activities (RoPA)

Date: 2026-09-09  
Status: `WORKING_ROPA` — factual/legal gaps remain fail-closed.

This RoPA separates RISCK COMPLY controller-side activities from processor-side customer workspace processing. It does not assume one role for the whole service.

| Processing activity | Candidate RISCK COMPLY role | Purposes | Data subjects / data | Recipients/providers | Transfers | Retention | Security/TOMs | State |
|---|---|---|---|---|---|---|---|---|
| Account registration & authentication | Controller for provider-side account administration; processor aspects may exist for customer-managed workforce accounts | create/manage accounts, authentication, access security | users; identity/contact/auth/session metadata | Supabase; Google Identity where enabled | See transfer register | active relationship + approved account-retention criteria | Auth, RBAC, RLS, step-up where relevant, audit | PENDING_EXTERNAL_REVIEW |
| Customer workspace content | Processor/subprocessor depending on customer's role | provide compliance workflows on documented instructions | customer users, employees, vendor contacts and persons represented in customer content; documents/risks/vendors/tasks/evidence | Supabase and other active service subprocessors | See transfer register | active service + approved deletion/return policy | tenant scope, RBAC, RLS, audit, export/delete controls | PENDING_EXTERNAL_REVIEW |
| Security & abuse prevention | Likely controller where RISCK COMPLY determines security purposes | protect service, detect abuse, investigate incidents | users/attackers; IP/device/log/authz/security metadata | hosting/database/monitoring/rate-limit providers | See transfer register | short operational/security window, legal hold if required | access controls, sanitised logs, incident response | BLOCKED_RETENTION_AND_LEGAL_BASIS |
| Billing & subscription administration | Likely controller for provider's contract/accounting administration | checkout, subscription, invoice/payment support, tax/accounting | customer contacts/payors; billing identifiers/subscription/payment metadata | Stripe and internal billing records | See transfer register | tax/accounting/dispute period not yet legally fixed | access controls, audit, provider security | PENDING_EXTERNAL_REVIEW |
| Customer support | Mixed: processor for customer content handled on instruction; controller for support administration may apply | answer support/security/procurement requests | customer/prospect contacts; messages, attachments, diagnostics | Google Workspace/email and any support provider | See transfer register | support retention period not approved | mailbox access, least privilege, incident handling | PENDING_EXTERNAL_REVIEW |
| Product analytics (optional) | Controller if RISCK COMPLY determines purposes | product usage measurement/improvement where lawfully enabled | users; usage/event identifiers and interaction metadata | PostHog if actually enabled | See transfer register | provider/account retention not confirmed | consent/configuration controls, minimisation | BLOCKED_PRODUCTION_CONFIGURATION |
| Commercial/marketing communications | Controller | respond to enquiries, sales/procurement, lawful marketing | prospects/customer contacts; contact and communication metadata | Google Workspace/email and approved marketing providers | See transfer register | period/legal basis not approved | access controls, opt-out/consent where applicable | PENDING_EXTERNAL_REVIEW |
| Legal/security evidence & incident records | Controller for RISCK COMPLY legal/security purposes; processor evidence may coexist | incident response, claims, regulatory/accountability evidence | affected users/customers; minimum necessary event metadata | internal systems/providers as necessary | See transfer register | purpose-specific, not yet fixed | restricted access, evidence preservation, audit | BLOCKED_RETENTION_AND_LEGAL_BASIS |

## Open RoPA fields

Before `ROPA=PASS`, complete:

1. final role allocation for mixed activities;
2. controller-side lawful bases and legitimate-interest assessments where applicable;
3. exact active recipient/provider list;
4. provider-by-provider Chapter V transfer treatment;
5. approved retention criteria/periods;
6. DPO/contact details only if Article 37 assessment requires them;
7. exact Production TOM/provider evidence date.

```text
ROPA_STRUCTURE=PASS
ROPA_PROCESSING_INVENTORY=PASS_PARTIAL_FACTS
ROPA_LEGAL_BASES=BLOCKED
ROPA_TRANSFERS=BLOCKED
ROPA_RETENTION=BLOCKED
ROPA=BLOCKED_FOR_FINAL
```