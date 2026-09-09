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
| Teammate invitation email entered by organisation admin | customer workspace administrator | controller for RISCK account/invitation administration, subject to final role review | privacy information should be delivered no later than the invitation/first communication | **MERGED_CANONICAL** via PR #2011: invitation email states that the address was supplied by an administrator of the named organisation, explains the invitation purpose/non-acceptance consequence, and links to the locale Privacy surface; canonical email sender supports delivery evidence with status/provider/idempotency/sent timestamp | V4 hardens Privacy-link origin allowlisting; linked Privacy page is still not a complete final Articles 13/14 notice, so full Article 14 content remains partial |
| Account/identity attributes returned by Google OAuth | identity provider in a user-initiated authentication flow | controller for RISCK account/security processing; direct-vs-indirect classification requires legal review because collection occurs through an identity provider during user action | safest product posture is to make Privacy information available before/at authentication and not rely on Article 14 exception | public Privacy link/surface exists, but completeness is blocked | final Privacy notice + authentication-surface evidence |
| Billing/customer attributes returned from Stripe after Checkout | Stripe/payment workflow following customer checkout | controller for billing/account administration for relevant provider-side metadata; Stripe separately controls its own payment processing | information should already be available before Checkout; if an attribute is first obtained indirectly and used to communicate, no later than first relevant communication | billing flow proven; complete notice not yet proven | reconcile approved Privacy notice with Checkout entry/confirmation surfaces |
| Support request submitted by an admin about another user | customer/admin/support requester | mixed; may be controller-side support/security administration or processor-side customer-content handling | if controller-side and RISCK contacts the individual, by first communication; otherwise no later than one month unless a documented exception applies | corporate support mailbox operational | add case classification to support/privacy runbook |
| Security/abuse report identifying another person | customer/user/security reporter or telemetry/provider | controller for security/abuse prevention where RISCK determines purposes/means, subject to case facts | no later than one month unless communication/disclosure occurs earlier, subject to a documented lawful Article 14(5) exception where genuinely applicable | security/audit channels exist | create attributable exception/notice decision record for actual cases |
| Customer workspace documents containing personal data of third parties | customer upload/import/integration | processor where processed solely on customer instructions | customer/controller transparency obligation; RISCK assists under DPA | processor role documented in DPA draft | close DPA/provider facts and DSAR routing; do not send independent notices from hosted content by default |
| Imported/integrated directory or vendor contact data | customer integration/admin | processor for customer-controlled business data unless RISCK independently reuses it for its own purpose | customer/controller transparency obligation unless RISCK establishes an independent controller purpose | integration/provider facts incomplete | classify per integration before activation/public claim |
| Public-source personal data | no current provider-side public-source enrichment proven | unknown | Article 14 source/public-source disclosure would be required if activated, subject to applicable exception | no active use proven in this lane | keep disabled/unclaimed until a factual flow exists and is reviewed |

## Invitation runtime evidence design

The canonical implementation in `src/lib/email/localized-invitation.ts` adds a narrow indirect-collection disclosure to the first invitation communication in every supported locale:

- source: an administrator of the named organisation provided the email address;
- purpose: sending/managing the invitation;
- consequence: the invitee need not create an account if they do not accept;
- privacy route: locale-specific `/[locale]/privacy` link.

V4 tightens the Privacy-link origin rule: absolute Privacy URLs are emitted only for HTTPS `risckcomply.com` / `*.risckcomply.com` origins or development `http://localhost`; any other HTTPS origin, unsafe scheme or malformed input falls back to the relative locale Privacy path. This prevents an untrusted invite-origin value from being reflected as the privacy-notice origin.

`src/lib/email/server-sender.ts` supports attributable delivery evidence in `email_delivery_logs`, including delivery status, provider identifier, attempts, idempotency key and `sent_at`. The content itself does not need to be copied into the audit record.

`tests/privacy/article14-invitation-notice.test.ts` proves locale-aware privacy-link rendering, unsafe-scheme fallback, untrusted-HTTPS-origin fallback, trusted RISCK COMPLY subdomain behavior and unsupported-locale fallback.

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

## Terminal state

```text
ARTICLE14_SCENARIO_INVENTORY=PASS
ARTICLE14_TIMING_RULE=PASS_DOCUMENTED
ARTICLE14_PROCESSOR_CONTROLLER_ROUTING=PASS_PRE_REVIEW
ARTICLE14_EXCEPTION_REGISTER=PASS_STRUCTURE_NO_EXCEPTIONS_ASSUMED
ARTICLE14_INVITATION_FIRST_COMMUNICATION_PATH=PASS_MERGED_CANONICAL
ARTICLE14_INVITATION_DELIVERY_EVIDENCE_MODEL=PASS_IMPLEMENTED
ARTICLE14_PRIVACY_LINK_ORIGIN_HARDENING=PASS_IMPLEMENTED_PRE_MERGE_V4
ARTICLE14_RUNTIME_DELIVERY=PARTIAL
ARTICLE14=PARTIAL
```

This register deliberately separates proof that a disclosure is present in the first communication from proof that the complete final Article 14 notice is legally and factually complete.