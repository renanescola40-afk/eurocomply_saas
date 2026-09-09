# RISCK COMPLY — GDPR Article 14 Indirect Collection Register

Date: 2026-09-09  
Purpose: map known cases where RISCK COMPLY may receive personal data from someone other than the data subject and define the notice deadline/routing rule without fabricating an Article 14 exception.

Official baseline: Regulation (EU) 2016/679, Article 14. Under Article 14(3), information must be provided within a reasonable period and at the latest within one month after obtaining the data; if the data are used to communicate with the individual, no later than the first communication; if disclosure to another recipient is envisaged, no later than the first disclosure.

## Decision rule

For each indirect collection event, determine first whether RISCK COMPLY is acting as:

- `CONTROLLER` for the relevant processing;
- `PROCESSOR` on customer instructions;
- `MIXED / UNDER_REVIEW`.

Do not apply a provider-side Article 14 workflow to customer-controlled workspace data merely because RISCK COMPLY hosts it. Where RISCK COMPLY acts only as processor, the customer remains responsible for its controller transparency duties and RISCK COMPLY provides contractual/technical assistance.

## Known indirect-data scenarios

| Scenario | Source of data | Likely role | Article 14 timing control | Current operational state | Remaining gap |
|---|---|---|---|---|---|
| Teammate invitation email entered by organisation admin | customer workspace administrator | controller for RISCK account/invitation administration, subject to final role review | privacy information should be delivered no later than the invitation/first communication | invitation data path exists; dedicated Article 14 notice evidence not yet proven | bind approved Privacy/indirect-collection notice to invitation delivery |
| Account/identity attributes returned by Google OAuth | identity provider in a user-initiated authentication flow | controller for RISCK account/security processing; direct-vs-indirect classification requires legal review because collection occurs through an identity provider during user action | safest product posture is to make Privacy information available before/at authentication and not rely on Article 14 exception | public Privacy link/surface exists, but completeness is blocked | final Privacy notice + authentication-surface evidence |
| Billing/customer attributes returned from Stripe after Checkout | Stripe/payment workflow following customer checkout | controller for billing/account administration for relevant provider-side metadata; Stripe separately controls its own payment processing | information should already be available before Checkout; if an attribute is first obtained indirectly and used to communicate, no later than first relevant communication | billing flow proven; complete notice not yet proven | reconcile approved Privacy notice with Checkout entry/confirmation surfaces |
| Support request submitted by an admin about another user | customer/admin/support requester | mixed; may be controller-side support/security administration or processor-side customer-content handling | if controller-side and RISCK contacts the individual, by first communication; otherwise no later than one month unless a documented exception applies | corporate support mailbox operational | add case classification to support/privacy runbook |
| Security/abuse report identifying another person | customer/user/security reporter or telemetry/provider | controller for security/abuse prevention where RISCK determines purposes/means, subject to case facts | no later than one month unless communication/disclosure occurs earlier, subject to a documented lawful Article 14(5) exception where genuinely applicable | security/audit channels exist | create attributable exception/notice decision record for actual cases |
| Customer workspace documents containing personal data of third parties | customer upload/import/integration | processor where processed solely on customer instructions | customer/controller transparency obligation; RISCK assists under DPA | processor role documented in DPA draft | close DPA/provider facts and DSAR routing; do not send independent notices from hosted content by default |
| Imported/integrated directory or vendor contact data | customer integration/admin | processor for customer-controlled business data unless RISCK independently reuses it for its own purpose | customer/controller transparency obligation unless RISCK establishes an independent controller purpose | integration/provider facts incomplete | classify per integration before activation/public claim |
| Public-source personal data | no current provider-side public-source enrichment proven | unknown | Article 14 source/public-source disclosure would be required if activated, subject to applicable exception | no active use proven in this lane | keep disabled/unclaimed until a factual flow exists and is reviewed |

## Article 14(5) exception discipline

No blanket Article 14 exception is approved.

An exception can be recorded only for a concrete processing event where the factual and legal conditions are documented. The case record must identify:

- the specific Article 14(5) limb relied upon;
- the facts supporting it;
- decision owner/reviewer;
- date;
- safeguards where required;
- evidence reference.

`We already have a privacy policy`, `the customer gave us the data`, `it would be inconvenient`, or `the data are business contact details` are not by themselves valid exception records.

## Operational notice states

Every controller-side indirect collection case should terminate in one of:

```text
NOTICE_BEFORE_OR_AT_FIRST_COMMUNICATION
NOTICE_WITHIN_ONE_MONTH
NOTICE_BEFORE_FIRST_DISCLOSURE
ARTICLE14_5_EXCEPTION_DOCUMENTED
NOT_APPLICABLE_PROCESSOR_ONLY
BLOCKED_ROLE_OR_FACTS
```

## Product handoff

The clearest immediate runtime gap is the teammate invitation path because the invitee email is explicitly optional data supplied by another user and the first invitation email is a natural Article 14(3)(b) delivery point.

Required product evidence before marking that scenario PASS:

1. invitation template contains or links to the approved Privacy/indirect-collection notice;
2. notice version/date is attributable;
3. first communication timestamp is auditable without logging unnecessary content;
4. unsubscribe/decline or account-rights route is clear where applicable;
5. cross-tenant isolation of invitation records remains intact.

## Terminal state

```text
ARTICLE14_SCENARIO_INVENTORY=PASS
ARTICLE14_TIMING_RULE=PASS_DOCUMENTED
ARTICLE14_PROCESSOR_CONTROLLER_ROUTING=PASS_PRE_REVIEW
ARTICLE14_EXCEPTION_REGISTER=PASS_STRUCTURE_NO_EXCEPTIONS_ASSUMED
ARTICLE14_RUNTIME_DELIVERY=PARTIAL
ARTICLE14=PARTIAL
```

This register deliberately separates a documented timing rule from proof that the notice was actually delivered in Production.