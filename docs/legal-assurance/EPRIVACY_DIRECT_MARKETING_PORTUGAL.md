# RISCK COMPLY — Portugal Electronic Direct Marketing / ePrivacy Rule Map

Date: 2026-09-09  
Status: `RULE_MAPPING_PASS_IMPLEMENTATION_BLOCKED` — current Portuguese rule structure mapped from official Diário da República sources; this is not counsel approval and does not authorize a marketing campaign by itself.

## Official sources

Primary source: Lei n.º 41/2004, de 18 de agosto, consolidated Article 13.º-A (Comunicações não solicitadas), Diário da República.  
https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2004-106523049-183878511

Related list obligation: Article 13.º-B, Diário da República.  
https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2004-106523049-183907401

The consolidated Article 13.º-A page records its latest change as 2022-08-16 and current status as in force. The consolidated text remains a convenience source and does not replace the underlying legislative acts.

## Decision matrix

| Recipient / scenario | Portuguese electronic-marketing rule | RISCK COMPLY state | Required control before use |
|---|---|---|---|
| Natural-person subscriber/user receiving unsolicited direct-marketing email/SMS/similar electronic communication | prior **express consent** required under Art. 13.º-A(1), subject to the existing-customer rule below | BLOCKED_NO_CONSENT_EVIDENCE_MODEL | do not send until valid consent evidence and withdrawal/suppression workflow exist |
| Legal-person subscriber receiving unsolicited direct-marketing electronic communication | Art. 13.º-A(2) permits until refusal, but Art. 13.º-B requires the promoter to respect/consult the national legal-person opposition list maintained by DGC | BLOCKED_DGC_LIST_AND_SUPPRESSION_WORKFLOW | classify recipient as legal person, consult required list at current required cadence, maintain suppression/refusal evidence |
| Existing customer; provider obtained electronic contact in context of a sale; marketing provider's own **similar** products/services | Art. 13.º-A(3) permits use if customer was clearly and explicitly offered a free/easy refusal at collection and in every message | BLOCKED_SOFT_OPT_IN_EVIDENCE | prove qualifying prior transaction, similarity, collection-time opt-out, per-message opt-out and no prior refusal |
| Any direct-marketing email | identity of sender must not be hidden/disguised; valid contact route for termination request required under Art. 13.º-A(4) | PASS_RULE_MAPPED / IMPLEMENTATION_NOT_PROVEN | sender identity + valid stop-contact + suppression evidence required for every applicable message |
| Person/entity has objected or withdrawn/refused | future marketing must be suppressed according to applicable route | BLOCKED_SUPPRESSION_DATA_PLANE | one canonical suppression source and send-time enforcement required |

## Article 13.º-B operational requirements

The current consolidated law requires entities promoting direct marketing to maintain an updated list covering persons who expressly consented and qualifying customers who did not object under the existing-customer rule. It also provides for a national DGC list of **legal persons** that expressly oppose unsolicited direct marketing and requires marketing promoters to consult the list made available by DGC.

RISCK COMPLY must not model `B2B` as automatically equal to `marketing allowed`. A business mailbox may belong to or directly identify a natural person, a sole trader, an employee/user, or a legal-person subscriber. Recipient classification matters.

## GDPR separation

GDPR Article 6(1)(f) and Recital 47 can make a legitimate-interest analysis relevant to some direct-marketing processing, but that does not override the more specific electronic-communications rules above.

Therefore:

```text
GDPR_LIA != EPRIVACY_PERMISSION_TO_SEND
B2B_CONTACT != AUTOMATIC_LEGAL_PERSON_CLASSIFICATION
EXISTING_CUSTOMER != AUTOMATIC_SOFT_OPT_IN
OPT_OUT_LINK != SUBSTITUTE_FOR_REQUIRED_PRIOR_CONSENT
```

## Current repository finding

This legal lane did not identify a canonical outbound email-marketing consent/suppression/DGC-list enforcement data plane in the current default-branch code search. The absence of search evidence is not used to prove that no such implementation exists anywhere; it is sufficient to keep non-essential outbound email marketing fail-closed in this lane.

Operational/service emails (security, invitations, billing, account notices) must remain classified separately from non-essential direct marketing and must not have promotional content added merely to exploit an operational send path.

## Required implementation contract

Before RISCK COMPLY credits electronic direct marketing as operationally ready, implement/prove:

1. recipient classification where the natural-person/legal-person distinction is relevant;
2. consent provenance + timestamp + scope where prior express consent is required;
3. existing-customer soft-opt-in evidence where relied upon: prior sale, own similar service, collection-time refusal opportunity and every-message refusal opportunity;
4. canonical suppression/objection list;
5. send-time suppression enforcement;
6. DGC legal-person opposition-list process/evidence where applicable;
7. sender identity and valid termination contact in each marketing message;
8. audit evidence without storing unnecessary message content;
9. separation between service communications and marketing;
10. retention criterion for consent/suppression evidence.

## Terminal state

```text
PORTUGAL_EPRIVACY_RULE_MAPPING=PASS
NATURAL_PERSON_PRIOR_CONSENT_RULE=PASS_MAPPED
LEGAL_PERSON_OPT_OUT_DGC_RULE=PASS_MAPPED
EXISTING_CUSTOMER_SIMILAR_SERVICE_RULE=PASS_MAPPED
MARKETING_IDENTITY_OPT_OUT_RULE=PASS_MAPPED
DIRECT_MARKETING_CONSENT_EVIDENCE=BLOCKED_IMPLEMENTATION
SUPPRESSION_ENFORCEMENT=BLOCKED_IMPLEMENTATION
DGC_LIST_PROCESS=BLOCKED_IMPLEMENTATION
DIRECT_MARKETING_RUNTIME_READY=NO
EPRIVACY_DIRECT_MARKETING_ANALYSIS=PASS_RULE_MAPPING_IMPLEMENTATION_BLOCKED
```

No outbound non-essential electronic marketing campaign receives readiness credit from this document alone.