# Founder Facts Questionnaire

**Status:** `FOUNDER_FACT_REQUIRED`  
**Purpose:** collect facts that code and repository evidence cannot establish, so counsel reviews decisions instead of discovering missing business information.

Do not guess. A fact is complete only when it contains a concrete current value or an explicit structured non-applicability decision with rationale:

```json
{
  "status": "NOT_APPLICABLE",
  "rationale": "Explain why this fact genuinely does not apply to the current operating model."
}
```

Plain `N/A`, `unknown`, `TBD`, `TODO`, `pending`, empty values and `null` are unresolved and must not receive founder-facts credit. The accepted record must also bind the exact final product SHA in `productSha`.

## 1. Contracting entity

1. Full registered legal name.
2. Company number, VAT number and registered address.
3. Country of establishment and governing-law preference.
4. Legal, privacy, security, billing and support email addresses.
5. Whether an EU representative or DPO is appointed and on what basis.

If no registered legal entity currently exists, do not invent identifiers. Record the affected entity fields as `NOT_APPLICABLE` only with a truthful rationale describing the current operating state; this factual treatment does not itself decide whether that operating model is legally sufficient.

## 2. Product and commercial model

1. Production product name and domains.
2. Customer types and excluded sectors/use cases.
3. Plans, billing cycle, trial, renewal and cancellation rules.
4. Refund, suspension, termination and data-export commitments.
5. Any negotiated enterprise order-form or SLA terms.

## 3. Data processing

1. Actual categories of personal and confidential data expected in production.
2. Controller/processor roles for account, billing, telemetry, support and customer content.
3. Production hosting/database/storage regions.
4. Retention periods for accounts, customer content, logs, backups, billing and audit records.
5. Cross-border transfer mechanisms and provider DPAs in force.
6. Data-subject request and deletion operating owners.

## 4. Active providers

For Vercel, Supabase, Stripe, Sentry, PostHog, email, support and any AI provider, confirm:

- enabled in production;
- legal entity and service;
- purpose and data categories;
- processing/storage region;
- transfer mechanism;
- DPA status;
- deletion/retention information;
- customer notification requirement.

Provider-public legal pages or repository configuration may support due diligence, but they do not prove that the RISCK COMPLY account is covered by a specific agreement, DPA, region or retention setting. Account-level claims require attributable evidence.

## 5. Security and operations

1. Supported availability and support commitments.
2. Incident severity model and communication targets.
3. Backup, restore and disaster-recovery commitments supported by evidence.
4. Security certifications, audits or penetration tests actually completed, with date and scope.
5. Vulnerability disclosure and security-contact process.

## 6. AI and legal positioning

1. Confirm Risck Comply is sold as compliance operations/evidence support, not legal advice or certification.
2. Confirm whether any AI provider processes customer content and whether training is enabled.
3. Confirm excluded prohibited/high-risk customer uses.
4. Confirm whether the business will provide partner-counsel referrals and the commercial relationship.
5. Confirm claims approved for website, sales decks, proposals and contracts.

## Required sign-off

The founder/authorised officer must sign the completed facts record with name, role, date and confirmation that the information is accurate to the best of their knowledge. The signed record is factual input, not legal approval.

Before promoting a record to `docs/compliance/evidence/accepted/founder-facts.json`, verify all required sections are resolved, `status` is genuinely `FOUNDER_FACTS_CONFIRMED`, `productSha` equals the exact frozen release SHA, the confidential signed artifact reference exists, and `factsDigest` is the SHA-256 digest of that signed source record. Do not place an unsigned draft, template, AI completion or fabricated signature at the accepted path.
