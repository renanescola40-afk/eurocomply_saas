# RISCK COMPLY — Commercial Terms Control Matrix

Date: 2026-09-10  
Scope: reconcile the Terms review draft and public Terms surface with actual B2B SaaS/product behavior and attributable owner decisions, while isolating provisions that genuinely require registry facts, fiscal evidence or qualified legal review.

Current factual reconciliation: `docs/legal-assurance/evidence/2026-09-10-terminal-fact-reconciliation.md`.

| Area | Current factual/document state | State | Who can close | Exact remaining decision/evidence |
|---|---|---|---|---|
| Service description | Multi-tenant AI governance/compliance operations SaaS; features depend on plan, add-ons and deployed configuration | PASS_DOCUMENTED | internal | Keep synced with product catalogue |
| B2B positioning | Terms/customer language is business-customer oriented and preserves mandatory-law boundary | PASS_DOCUMENTED | internal + counsel for final effect | Avoid unsupported consumer-waiver claims |
| No legal advice / no compliance guarantee | Explicitly stated in Terms and public compliance posture | PASS_DOCUMENTED | internal | Public Claims Guard must remain green |
| Public Terms structure/versioning | Versioned `PublicLegalReviewPage`; `REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED`; EN/PT content merged through PR #2040 and directly observed in Production as version `0.2-review` | PASS_CANONICAL_MAIN_AND_LIVE_REVIEW_DRAFT | internal | Keep protected claims/security checks green; no further source work absent a real defect or accepted decision |
| Contract formation / order precedence | Order Form > DPA > negotiated schedule > Terms > public docs proposed and explicitly non-final | PENDING_EXTERNAL_REVIEW | counsel | Confirm enforceability/incorporation mechanics for self-service and negotiated Enterprise sales |
| Operator / contracting identity | Attributable correspondence designates `SAMUEL CERQUEIRA, UNIPESSOAL LDA` as the RISCK COMPLY operator. It does not expressly designate the customer-contract counterparty. Authoritative registered office/identifiers/signatory evidence is also not yet credited. | OPERATOR_PARTIAL_PASS_CONTRACTING_ENTITY_OPEN | owner + authoritative registry evidence | Explicitly designate the customer contracting/seller entity, then attach verified registered facts before final contract/public entity clauses |
| Plan/pricing catalogue | Terms defer exact price, interval, included capabilities and add-ons to active billing authority/order rather than hardcoding marketing prices | PASS_SAFE_BOUNDARY | internal/billing | Keep Terms synchronized with live billing authority; runtime billing evidence remains separate |
| Renewal | Subscription lifecycle exists; final auto-renewal/contract-formation wording not approved | PENDING_OWNER_AND_EXTERNAL_REVIEW | owner + counsel | Approve renewal wording and notice obligations |
| Cancellation | Supported self-service cancellation preserves access through the already-paid period; attributable owner correspondence selects end-of-paid-period cancellation as the intended self-service rule | PASS_BEHAVIOR_AND_OWNER_POSITION_PENDING_COUNSEL | internal/billing + counsel | Exact-SHA/live-customer billing evidence remains separate; counsel confirms final clause mechanics |
| Upgrade/downgrade | Supported upgrades may use proration; supported downgrades may take effect next period | PASS_BEHAVIOR_DOCUMENTED | internal/billing | Ensure final contract language follows actual live behavior |
| Add-ons | Provider-backed add-on authority exists; Terms state that URL/browser/docs never grant entitlement | PASS_DOCUMENTED | internal/billing | Controlled live-customer proof remains billing-lane gate |
| Refund policy | Attributable owner correspondence selects no default refund, subject to mandatory law and any signed order-form exception; public review page has not yet been promoted to binding wording | OWNER_POSITION_SELECTED_PENDING_COUNSEL | owner + counsel | Counsel validates mandatory-law carve-outs, duplicate/provider-error handling and negotiated credits before final clause publication |
| Taxes/VAT | Terms make no blanket tax claim; seller/tax facts remain provider/accountant/tax-authority dependent | BLOCKED_PROVIDER_AND_LEGAL | billing/tax lane + owner | Contracting/seller entity designation, LIVE tax setup, seller VAT facts, invoice treatment and final wording |
| Non-payment/suspension | Operational concept and proportionality boundary documented without inventing cure periods | PENDING_OWNER_AND_EXTERNAL_REVIEW | owner + counsel + billing | Notice, cure, emergency exception and restoration rules |
| Acceptable use | Security, unlawful use, prohibited AI practices, cross-tenant abuse and unsupported sensitive-data uses covered | PASS_DOCUMENTED | internal + specialist for edge cases | Keep aligned with Article 5 and product capabilities |
| Customer content / instructions | Customer ownership + limited operational-processing licence structure documented | PENDING_EXTERNAL_REVIEW | privacy/counsel | Confirm controller/processor role wording, improvement-use boundary and third-party rights |
| AI/compliance outputs | Human-review requirement and non-certification/non-legal-opinion boundary public | PASS_SAFE_BOUNDARY | internal + qualified reviewer for legal sufficiency | Keep public claims evidence-bound |
| Confidentiality | Mutual reasonable-care structure and unresolved legal mechanics explicitly separated | STRUCTURE_IMPLEMENTED_PENDING_EXTERNAL_REVIEW | counsel | Exceptions, compelled disclosure, duration, remedies and residual knowledge |
| Security commitments | Explicitly evidence-bound; no unsupported certification/pentest/uptime/RPO/RTO promise incorporated | PASS_DOCUMENTED | internal | Only signed evidence-backed commitments may expand this |
| Subprocessors | Public/current provider disclosure and transfer surfaces implemented; direct Supabase DPA framework evidence and PostHog DPA completion evidence reduce contractual uncertainty without proving all account/provider facts | STRONG_PARTIAL_PASS | privacy/provider + counsel | Final authorisation, advance notice, objection/remedy and remaining account-specific contract facts |
| International transfers | Current transfer evidence boundary publicly structured; no executed-SCC or universal-compliance claim. Provider DPA evidence is stronger, but it does not itself establish all Chapter V mechanisms/locations/TIA conclusions. | STRONG_PARTIAL_PASS | privacy/provider + counsel | Account-specific mechanisms, locations, TIA/supplementary measures and qualified legal decision |
| IP / licence | Provider/licensor rights + limited customer service licence structure documented | PENDING_OWNER_AND_EXTERNAL_REVIEW | owner + counsel | Confirm template/output ownership, third-party rights and customer-data licence scope |
| Feedback | Feedback-use concept is explicitly non-final | PENDING_OWNER_AND_EXTERNAL_REVIEW | owner + counsel | Confirm commercial preference and confidentiality boundary |
| Termination for breach | Decision boundary structured; no invented cure periods or immediate-termination grounds | BLOCKED_OWNER_COUNSEL | owner + counsel | Cure periods, immediate grounds, proportionality and effects |
| Post-termination export | Attributable owner correspondence selects a 30-day post-termination export-window position; technical/provider compatibility and final legal wording remain unaccepted | OWNER_POSITION_SELECTED_PENDING_PRODUCT_AND_COUNSEL | owner + privacy + technical/provider evidence | Confirm product/provider ability to honor the window, exceptions/legal holds and final clause |
| Deletion after termination | DPA/category-retention/legal-hold/billing/audit/provider lifecycle boundary documented | BLOCKED_PROVIDER_AND_LEGAL | privacy/provider + counsel | Final category periods, provider deletion/backup facts and contract wording |
| Warranties | No compliance guarantee; no default uptime SLA is the selected owner position unless expressly contracted; any other positive performance warranty/remedy remains non-final | OWNER_POSITION_PARTIAL_PENDING_COUNSEL | owner + counsel | Final service standard, exclusions and remedies |
| Indemnities | Risk categories identified without presenting a binding indemnity | BLOCKED_OWNER_COUNSEL | owner + counsel | Customer unlawful-use and provider IP indemnity structure, defence and remedies |
| Liability | Risk categories and carve-out topics identified without publishing a cap | BLOCKED_OWNER_COUNSEL | owner + counsel | Cap, excluded losses, carve-outs, insurance alignment, mandatory-law treatment |
| Governing law/forum | Attributable owner correspondence selects a Portuguese-law preference; forum/arbitration mechanics and final enforceability remain unresolved and the public review page is still deliberately non-binding | OWNER_POSITION_SELECTED_PENDING_COUNSEL | owner + Portuguese counsel | Confirm Portuguese law, court/forum or arbitration mechanics and mandatory-law boundaries |
| Notices | `comercial@risckcomply.com` verified for general intake only | PARTIAL | counsel + owner | Legal-effect delivery, deemed receipt, postal/dedicated notice mechanics |
| Service levels | No standard uptime SLA unless expressly contracted is the attributable owner position; Enterprise SLA remains contract-specific | OWNER_POSITION_SELECTED_SAFE_BOUNDARY | internal + commercial + counsel | Add SLA metrics only with operational evidence and explicit contract acceptance |

## Repository-controlled closure achieved

The canonical Terms route no longer exposes a short, unversioned production-draft summary. PR #2040 merged the fail-closed legal-review shell with versioning, non-effective status, no stale hard-coded plan prices, and explicit separation of genuine unresolved risk-allocation decisions. Direct Production validation on 2026-09-10 observed the `0.2-review` surface as `REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED`.

Later attributable evidence allows the operator to be recorded without guessing the customer contractual counterparty. Several `OWNER_DECISION=OPEN` labels are also refined using later attributable commercial-position evidence. This reconciliation does **not** promote any of those facts to qualified legal acceptance or binding customer terms.

## Remaining terminal blockers

The remaining Terms blockers are concentrated in attributable entity/tax facts and genuine commercial/legal decisions:

- explicit owner designation of the RISCK COMPLY customer contracting/seller entity;
- authoritative registered office/company identifiers/signatory facts for the selected entity;
- renewal/formation mechanics;
- non-payment/suspension and termination/cure rules;
- provider-backed deletion lifecycle and validation that the 30-day owner-selected export window can actually be honored;
- final positive warranty/remedy position beyond the no-default-SLA boundary;
- indemnities and liability cap/carve-outs;
- final court/forum/arbitration and legal-notice mechanics under the Portuguese-law preference;
- tax/VAT seller facts and final billing wording;
- qualified legal review of formation, enforceability and the final contract set.

```text
TERMS_FACTUAL_PRODUCT_ALIGNMENT=STRONG_PARTIAL_PASS
TERMS_PUBLIC_CLAIM_SAFETY=PASS_CANONICAL_MAIN
TERMS_PUBLIC_STRUCTURE=PASS_CANONICAL_MAIN_AND_LIVE_REVIEW_DRAFT
TERMS_CONTRACTING_ENTITY=OPEN_OWNER_CONFIRMATION
TERMS_OWNER_DECISIONS=PARTIAL_SELECTED
TERMS_EXTERNAL_LEGAL_REVIEW=PENDING_EXTERNAL_REVIEW
TERMS_FINAL_PUBLICATION=BLOCKED
TERMS_DOCUMENTATION=STRUCTURE_IMPLEMENTED_BLOCKED_FINAL_FACTS_DECISIONS_AND_REVIEW
```

`NO_DOCUMENTATION_LOOP=true`: do not generate another Terms dossier merely to restate these blockers. New Terms work should be driven by authoritative entity/tax/provider evidence, a remaining owner risk decision, a qualified reviewer request, or a real defect found by protected validation.