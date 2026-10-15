# Known Risks and Remediation Register
Date: 2026-10-14 | Owner: Seller diligence controller | All items OPEN unless independent closing evidence arrives.

| ID | Priority | Gap | Evidence/request | Responsible party |
|---|---|---|---|---|
| G01 | Critical | Executed creator-to-seller IP chain not demonstrated | signed instrument and chain/title review | Owner + counsel |
| G02 | Critical | Official registry, articles, RCBE, signatory authority not fully credited | up-to-date official certified records | Owner |
| G03 | Critical | Tax status, VAT/VIES and clearance not credited | official AT records + tax counsel/accountant | Accountant |
| G04 | Critical | Financial statements, bank/cash/debt, full revenue position incomplete | complete official ledger + statements | Accountant |
| G05 | High | Provider account ownership/transfer close-out incomplete | dated account and contract proofs | Provider account owner |
| G06 | High | Independent clean security retest/tenant isolation unproven | authorized attributable final reports | Security assessor |
| G07 | High | Source SHA versus production and release gates not freshly validated in this pass | deploy SHA and CI logs | Technical diligence |
| G08 | High | Domain/brand/trademark legal title unproven | registrar, trademark and source-asset provenance | Owner + counsel |
| G09 | Medium | Current GDPR/DPA executed legal posture needs evidence | signed and counsel-reviewed documents | Counsel/provider |
| G10 | Medium | Buyer-specific diligence, approvals and transaction structure not agreed | actual buyer request + approvals | Seller + buyer |

Do not treat any gap as closed because a remediation plan, checklist or template exists.


## Additional observed conflicts — V2, 2026-10-15
| ID | Priority | Risk and evidence | Required resolution | Status |
|---|---|---|---|---|
| G11 | Critical | `docs/assurance/iso27001-soc2/exact-sha-production-drift-2026-10-15.md` documents a *dated* 108-commit main/deploy divergence and deployed SHA `857ddfb21d0135df3a026ad480da5945119b175c`. Snapshot is not present-time proof. | New read-only Vercel/GitHub comparison, exact-SHA CI and buyer-facing qualification; deploying requires separate authorization | OPEN |
| G12 | High | Security PR #2477 was OPEN when reviewed, proposing privileged-key rejection for a local tenant-isolation proof. Proposed/tested code is not assumed merged or deployed. | Re-evaluate PR state and supported results before any security completion claim | OPEN |
| G13 | High | Full document-link/reference coverage and confidential-material scan absent; 6/6 existing relative Markdown links are not exhaustive. | Clean isolated checkout full source/attachment link, secret, PII and privilege screening; redacted output under owner review | OPEN |

G01–G10 remain OPEN unless separate authenticated closure evidence is recorded. All gaps are documentary observations, not exploitation findings.

## V6 verified recency reconciliation — 2026-10-15

The original G11–G13 above were OPEN at their own 2026-10-15 earlier checkpoint. Their historical statements must not be interpreted as current PR and CI results.

| ID | Newly authenticated evidence | Current scope state | Not closed by this finding |
|---|---|---|---|
| G07 / G11 | Read-only authenticated Vercel deployment lookup: public alias `www.risckcomply.com` is assigned to READY deployment `dpl_G46QK2En1purZiDjnDMamBjcWrEB`, associated with Git SHA `3310757dc82c2f5b07a5763b2e4b6e9fc5b4bfc5`. Compared with frozen `main@57f74e107dc2c51cfb0219f5e5dcdc44064c6907`: **69 commits ahead**, zero behind. | **DRIFT VERIFIED (DATED)**; runtime exact-main parity remains OPEN. This refresh supersedes older 108- and 24-commit snapshots only for this timestamp. | Deployment status does not demonstrate security correctness, terminal assurance, source/production equivalence or DataGuard demo health. |
| G12 | GitHub PR **#2477 MERGED**, merge commit `6944c93be0b179e8f0b8eafc34b8ee9f5b01e26d`. | **Historical open-PR administrative conflict CLOSED** at current source. | Presence of source-level privileged-key rejection does not prove deployed tenant isolation. |
| G13 | GitHub offline DataGuard source auditor V4 run `38805676055`, job `116665764551` completed **SUCCESS**; 10/10 tests, 79 eligible documents at that PR CI checkout, no tracked local reference failure or suspected high-confidence token; source manifest V6 enumerates 80/80 current eligible docs at immutable baseline. | **Scoped source inventory and offline credential-pattern screen PASS on their respective frozen inputs.** | No complete personal-data/privilege/legal review or Stage B/C clearance. V5/V6 exact-head CI and manual disclosures remain separate gates. |
| Privacy / history | GitHub current canonical repository metadata reports **private**, correcting the 2026-10-07 public-visibility snapshot. | **CURRENT_PRIVATE_VERIFIED** | Historical forks/caches/prior clones purge not independently established. |

**There is no legitimate reduction** of G01–G10 to CLOSED from these internal source observations. The seven overarching external-closing dependency categories remain OPEN. Owner/buyer release remains HOLD, no emails sent, and no production or demo operations performed. CI results are tied to their observed run/checkout, never generalized across later commits.
