# RISCK COMPLY — Commercial Terms Control Matrix

Date: 2026-09-09  
Scope: reconcile the Terms review draft with actual B2B SaaS/product behavior and isolate the clauses that genuinely require owner/counsel judgment.

| Area | Current factual/document state | State | Who can close | Exact remaining decision/evidence |
|---|---|---|---|---|
| Service description | Multi-tenant AI governance/compliance operations SaaS; features plan/configuration dependent | PASS_DOCUMENTED | internal | Keep synced with product catalogue |
| B2B positioning | Terms/customer language is business-customer oriented | PASS_DOCUMENTED | internal | Avoid B2C/consumer claims unless product motion changes |
| No legal advice / no compliance guarantee | Explicitly stated in Terms and public compliance posture | PASS_DOCUMENTED | internal | Public Claims Guard must remain green |
| Contract formation / order precedence | Order Form > DPA > negotiated schedule > Terms > public docs proposed | PENDING_EXTERNAL_REVIEW | counsel | Confirm enforceability/incorporation mechanics for self-serve and negotiated enterprise sales |
| Provider legal identity | Entity name owner-supplied; registered office/NIF unresolved | BLOCKED | owner/factual evidence | Authoritative Portuguese registry evidence |
| Plan/pricing catalogue | Essential €49, Professional €149, Business €399, Enterprise from €990; no free trial recorded in review draft | PASS_DOCUMENTED_PENDING_BILLING_EXACTNESS | billing lane | Keep prices/availability aligned with LIVE provider configuration |
| Renewal | Subscription lifecycle exists; exact auto-renewal disclosure/contract formation language not final | PENDING_EXTERNAL_REVIEW | owner + counsel | Approve renewal wording and notice obligations |
| Cancellation | Self-serve cancellation at end of paid period and reactivation before period end are documented behavior | PASS_BEHAVIOR_DOCUMENTED | internal/billing | Exact-SHA billing evidence remains separate lane |
| Upgrade/downgrade | Supported upgrades use proration; supported downgrades next period | PASS_BEHAVIOR_DOCUMENTED | internal/billing | Ensure public/contract language follows actual LIVE behavior |
| Refund policy | Not approved | BLOCKED_OWNER_DECISION | owner + counsel | Define refund/no-refund rules, mandatory-law carve-outs and exceptional credits |
| Taxes/VAT | Fact/provider dependent; no blanket tax claim | BLOCKED_PROVIDER_AND_LEGAL | billing/tax lane | LIVE tax setup, seller VAT facts, invoice treatment and final wording |
| Non-payment/suspension | Suspension concept drafted | PENDING_EXTERNAL_REVIEW | counsel + billing | Notice/cure/emergency restoration rules |
| Acceptable use | Security, unlawful use, prohibited AI practices, cross-tenant abuse and unsupported sensitive-data uses covered | PASS_DOCUMENTED | internal + specialist for edge cases | Keep aligned with Article 5 and product capabilities |
| Customer content / instructions | Customer control and provider processing rights drafted | PENDING_EXTERNAL_REVIEW | privacy/counsel | Confirm controller/processor role wording and improvement-use boundary |
| Confidentiality | Mutual reasonable-care structure drafted | PENDING_EXTERNAL_REVIEW | counsel | Exceptions, compelled disclosure, duration and remedies |
| Security commitments | Explicitly evidence-bound; no unsupported certification/pentest/uptime incorporation | PASS_DOCUMENTED | internal | Only signed evidence-backed commitments may expand this |
| Subprocessors | Contract points to active register and DPA notice process | BLOCKED | privacy/provider evidence + counsel | Close provider register + authorisation/notice/objection mechanism |
| IP / licence | Provider ownership and limited customer licence drafted | PENDING_EXTERNAL_REVIEW | counsel | Confirm template/content ownership, third-party rights and customer-data licence scope |
| Feedback | Non-identifying feedback licence proposed | PENDING_EXTERNAL_REVIEW | counsel | Confirm commercial preference and confidentiality boundary |
| Termination for breach | Placeholder | BLOCKED | counsel + owner | Cure periods, immediate termination grounds, effects |
| Post-termination export | Placeholder | BLOCKED_OWNER_DECISION | owner + privacy | Set export window compatible with retention/provider capabilities |
| Deletion after termination | DPA/retention/legal hold/audit boundary drafted | BLOCKED | privacy/provider evidence + counsel | Final retention schedule and backup/provider facts |
| Warranties | Material performance + no compliance guarantee structure drafted | PENDING_EXTERNAL_REVIEW | counsel | Final standard/limitations/remedies |
| Indemnities | Placeholder | BLOCKED_COUNSEL | counsel + owner risk decision | Customer unlawful-use and provider IP indemnity structure |
| Liability | Placeholder | BLOCKED_COUNSEL | counsel + owner risk decision | Cap, excluded losses, carve-outs, fraud/wilful misconduct, data/IP/confidentiality treatment |
| Governing law/forum | Placeholder | BLOCKED_OWNER_COUNSEL | owner + Portuguese counsel | Choose law/forum and mandatory-law boundaries |
| Notices | `comercial@risckcomply.com` verified for general intake | PARTIAL | counsel + owner | Legal-effect delivery/deemed receipt/postal/dedicated notice mechanics |
| Service levels | No unsupported uptime commitment; enterprise SLA contract-specific | PASS_SAFE_BOUNDARY | internal + commercial | Only add SLA metrics with operational evidence |

## Separation of work

The matrix shows that many Terms sections are already factually and operationally grounded. The remaining blockers are concentrated in a smaller set of genuine legal/commercial choices: liability, indemnity, governing law/forum, refunds, suspension/termination mechanics, contract formation/renewal, legal notices and post-termination export/deletion.

```text
TERMS_FACTUAL_PRODUCT_ALIGNMENT=STRONG_PARTIAL_PASS
TERMS_PUBLIC_CLAIM_SAFETY=PASS
TERMS_OWNER_DECISIONS=BLOCKED
TERMS_EXTERNAL_LEGAL_REVIEW=PENDING_EXTERNAL_REVIEW
TERMS_DOCUMENTATION=PARTIAL
```

AI/documentation work must not convert those judgment calls into final enforceable terms without the appropriate owner/counsel decision.