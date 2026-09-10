# RISCK COMPLY — Commercial Terms Control Matrix

Date: 2026-09-10  
Scope: reconcile the Terms review draft and public Terms surface with actual B2B SaaS/product behavior, then isolate the provisions that genuinely require founder facts, owner risk decisions or qualified legal review.

| Area | Current factual/document state | State | Who can close | Exact remaining decision/evidence |
|---|---|---|---|---|
| Service description | Multi-tenant AI governance/compliance operations SaaS; features depend on plan, add-ons and deployed configuration | PASS_DOCUMENTED | internal | Keep synced with product catalogue |
| B2B positioning | Terms/customer language is business-customer oriented and preserves mandatory-law boundary | PASS_DOCUMENTED | internal + counsel for final effect | Avoid unsupported consumer-waiver claims |
| No legal advice / no compliance guarantee | Explicitly stated in Terms and public compliance posture | PASS_DOCUMENTED | internal | Public Claims Guard must remain green |
| Public Terms structure/versioning | Versioned `PublicLegalReviewPage`; `REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED`; EN/PT complete content with fail-closed EN fallback, merged to protected `main` through PR #2040 | PASS_CANONICAL_MAIN | internal | Keep protected claims/security checks green; no further source work absent a real defect or accepted decision |
| Contract formation / order precedence | Order Form > DPA > negotiated schedule > Terms > public docs proposed and explicitly non-final | PENDING_EXTERNAL_REVIEW | counsel | Confirm enforceability/incorporation mechanics for self-service and negotiated Enterprise sales |
| Provider legal identity | Final contracting/operator entity, registered office and authoritative registered/tax identifiers unresolved | BLOCKED | owner/factual evidence | Authoritative final entity decision and registry evidence |
| Plan/pricing catalogue | Terms defer exact price, interval, included capabilities and add-ons to active billing authority/order rather than hardcoding marketing prices | PASS_SAFE_BOUNDARY | internal/billing | Keep Terms synchronized with live billing authority; runtime billing evidence remains separate |
| Renewal | Subscription lifecycle exists; final auto-renewal/contract-formation wording not approved | PENDING_OWNER_AND_EXTERNAL_REVIEW | owner + counsel | Approve renewal wording and notice obligations |
| Cancellation | Supported self-service cancellation preserves access through the already-paid period; reactivation before period end documented | PASS_BEHAVIOR_DOCUMENTED | internal/billing | Exact-SHA/live-customer billing evidence remains separate lane |
| Upgrade/downgrade | Supported upgrades may use proration; supported downgrades may take effect next period | PASS_BEHAVIOR_DOCUMENTED | internal/billing | Ensure final contract language follows actual live behavior |
| Add-ons | Provider-backed add-on authority exists; Terms state that URL/browser/docs never grant entitlement | PASS_DOCUMENTED | internal/billing | Controlled live-customer proof remains billing-lane gate |
| Refund policy | No blanket refund/no-refund rule published; final policy intentionally unresolved | BLOCKED_OWNER_DECISION | owner + counsel | Define refund rules, mandatory-law carve-outs and exceptional credits |
| Taxes/VAT | Terms make no blanket tax claim; seller/tax facts remain entity/provider dependent | BLOCKED_PROVIDER_AND_LEGAL | billing/tax lane + owner | LIVE tax setup, seller VAT facts, invoice treatment and final wording |
| Non-payment/suspension | Operational concept and proportionality boundary documented without inventing cure periods | PENDING_OWNER_AND_EXTERNAL_REVIEW | owner + counsel + billing | Notice, cure, emergency exception and restoration rules |
| Acceptable use | Security, unlawful use, prohibited AI practices, cross-tenant abuse and unsupported sensitive-data uses covered | PASS_DOCUMENTED | internal + specialist for edge cases | Keep aligned with Article 5 and product capabilities |
| Customer content / instructions | Customer ownership + limited operational-processing licence structure documented | PENDING_EXTERNAL_REVIEW | privacy/counsel | Confirm controller/processor role wording, improvement-use boundary and third-party rights |
| AI/compliance outputs | Human-review requirement and non-certification/non-legal-opinion boundary public | PASS_SAFE_BOUNDARY | internal + qualified reviewer for legal sufficiency | Keep public claims evidence-bound |
| Confidentiality | Mutual reasonable-care structure and unresolved legal mechanics explicitly separated | STRUCTURE_IMPLEMENTED_PENDING_EXTERNAL_REVIEW | counsel | Exceptions, compelled disclosure, duration, remedies and residual knowledge |
| Security commitments | Explicitly evidence-bound; no unsupported certification/pentest/uptime/RPO/RTO promise incorporated | PASS_DOCUMENTED | internal | Only signed evidence-backed commitments may expand this |
| Subprocessors | Public/current provider disclosure and transfer surfaces implemented; provider presence does not equal contractual approval | STRONG_PARTIAL_PASS | privacy/provider + counsel | Final authorisation, advance notice, objection/remedy and account-specific contract facts |
| International transfers | Current transfer evidence boundary publicly structured; no executed-SCC or universal-compliance claim | STRONG_PARTIAL_PASS | privacy/provider + counsel | Account-specific mechanisms, locations, TIA/supplementary measures and qualified legal decision |
| IP / licence | Provider/licensor rights + limited customer service licence structure documented | PENDING_OWNER_AND_EXTERNAL_REVIEW | owner + counsel | Confirm template/output ownership, third-party rights and customer-data licence scope |
| Feedback | Feedback-use concept is explicitly non-final | PENDING_OWNER_AND_EXTERNAL_REVIEW | owner + counsel | Confirm commercial preference and confidentiality boundary |
| Termination for breach | Decision boundary now structured; no invented cure periods or immediate-termination grounds | BLOCKED_OWNER_COUNSEL | owner + counsel | Cure periods, immediate grounds, proportionality and effects |
| Post-termination export | Explicitly unresolved; no unsupported export window published | BLOCKED_OWNER_DECISION | owner + privacy | Set export window compatible with product/provider capabilities |
| Deletion after termination | DPA/category-retention/legal-hold/billing/audit/provider lifecycle boundary documented | BLOCKED_PROVIDER_AND_LEGAL | privacy/provider + counsel | Final category periods, provider deletion/backup facts and contract wording |
| Warranties | Compliance guarantee denied; any positive performance warranty/remedy intentionally non-final | BLOCKED_OWNER_COUNSEL | owner + counsel | Final standard, exclusions and remedies |
| Indemnities | Risk categories identified without presenting a binding indemnity | BLOCKED_OWNER_COUNSEL | owner + counsel | Customer unlawful-use and provider IP indemnity structure, defence and remedies |
| Liability | Risk categories and carve-out topics identified without publishing a cap | BLOCKED_OWNER_COUNSEL | owner + counsel | Cap, excluded losses, carve-outs, insurance alignment, mandatory-law treatment |
| Governing law/forum | Public page deliberately states unresolved; no jurisdiction invented | BLOCKED_OWNER_COUNSEL | owner + Portuguese counsel | Choose law/forum or arbitration and mandatory-law boundaries |
| Notices | `comercial@risckcomply.com` verified for general intake only | PARTIAL | counsel + owner | Legal-effect delivery, deemed receipt, postal/dedicated notice mechanics |
| Service levels | No unsupported uptime commitment; Enterprise SLA remains contract-specific | PASS_SAFE_BOUNDARY | internal + commercial | Add SLA metrics only with operational evidence and explicit contract acceptance |

## Repository-controlled closure achieved in this Terms pass

The canonical `main` Terms route no longer exposes a short, unversioned production-draft summary. PR #2040 merged the fail-closed legal-review shell with versioning, non-effective status, no historical candidate entity, no stale hard-coded plan prices, and explicit separation of genuine unresolved risk-allocation decisions.

The canonical review draft is also reconciled so the unresolved contracting entity is not promoted from a historical candidate into contractual truth.

## Remaining terminal blockers

The remaining Terms blockers are not additional writing tasks. They are concentrated in attributable facts and genuine commercial/legal decisions:

- final contracting/operator entity and registered facts;
- refund policy and renewal mechanics;
- non-payment/suspension and termination/cure rules;
- post-termination export window and provider deletion lifecycle;
- positive warranty/remedy position;
- indemnities and liability cap/carve-outs;
- governing law/forum and legal notices;
- tax/VAT seller facts and final billing wording;
- qualified legal review of formation, enforceability and the final contract set.

```text
TERMS_FACTUAL_PRODUCT_ALIGNMENT=STRONG_PARTIAL_PASS
TERMS_PUBLIC_CLAIM_SAFETY=PASS_CANONICAL_MAIN
TERMS_PUBLIC_STRUCTURE=PASS_CANONICAL_MAIN
TERMS_OWNER_DECISIONS=BLOCKED
TERMS_EXTERNAL_LEGAL_REVIEW=PENDING_EXTERNAL_REVIEW
TERMS_DOCUMENTATION=STRUCTURE_IMPLEMENTED_BLOCKED_FINAL_FACTS_AND_REVIEW
```

`NO_DOCUMENTATION_LOOP=true`: do not generate another Terms dossier merely to restate these blockers. New Terms work should be driven by a resolved owner fact/decision, provider evidence, a qualified reviewer request, or a defect found by protected CI/runtime validation.
