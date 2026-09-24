# RISCK COMPLY — Buyer First 48 Hours Handoff

Date: 2026-09-24  
Status: `CONTROLLED_DISCLOSURE_PLAYBOOK`

Never send credentials, secrets, raw production exports, customer data, privileged legal advice or unrestricted security reproduction details.

## TIER_1_INITIAL_SHARE

Share before NDA when commercially appropriate:

- product one-pager;
- short pitch deck;
- 10-minute demo script;
- public pricing source;
- architecture overview at buyer-safe level;
- public Trust Center/security questionnaire;
- public procurement pack;
- buyer-safe Enterprise Due Diligence Q&A.

Purpose: confirm strategic/technical fit without exposing confidential evidence.

## TIER_2_AFTER_MUTUAL_INTEREST

Share after the buyer has demonstrated meaningful interest:

- enterprise onboarding plan;
- detailed architecture diagram;
- security overview and control summaries;
- DPA review structure;
- privacy/retention/subprocessor/transfer summaries;
- AI Act/GDPR package index;
- SLA framework;
- current external-assurance status.

Purpose: allow procurement/security/legal teams to scope diligence and identify buyer-specific asks.

## TIER_3_AFTER_NDA

Share only through a controlled channel:

- detailed technical security evidence;
- runtime/release evidence tied to current SHA/environment;
- confidential pentest report/reference where disclosure rights allow;
- deeper RLS/RBAC/tenant-isolation evidence;
- audit-chain evidence;
- backup/recovery evidence;
- SBOM/license/dependency detail;
- source/IP diligence index;
- provider evidence that contains non-public account metadata but no secrets.

Purpose: substantive diligence while minimizing unnecessary disclosure.

## TIER_4_DUE_DILIGENCE_ONLY

Share only when specifically required and authorized:

- source-code review access or narrowly scoped source extracts;
- highly confidential provider/account evidence;
- signed/negotiated schedules;
- privileged or counsel-reviewed material if legally appropriate;
- authoritative company/registry/tax/signatory documents outside this workstream;
- buyer-specific evidence requests.

## Disclosure controls

For every release:

1. identify recipient, company and diligence purpose;
2. classify each file as PUBLIC, BUYER_SAFE, NDA_REQUIRED, HIGHLY_CONFIDENTIAL or EXTERNAL_PENDING;
3. bind runtime claims to SHA/environment/date;
4. redact secrets, customer identifiers and unnecessary provider identifiers;
5. retain a record of what was shared;
6. do not upgrade partial/external states merely because a buyer requests a yes/no answer;
7. route negotiated contractual commitments through the applicable commercial/legal process.

## First-48-hours buyer sequence

Hour 0–4: Tier 1 package and discovery context.  
Hour 4–24: answer buyer-safe Q&A and identify requested diligence domains.  
Hour 24–48: if mutual interest/NDA exists, open Tier 2/Tier 3 material narrowly against the buyer's request list.

No asking price, valuation, customer/revenue claim or acquisition probability is implied by this handoff.
