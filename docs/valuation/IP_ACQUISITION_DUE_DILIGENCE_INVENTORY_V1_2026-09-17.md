# RISCK COMPLY — IP / Acquisition Due-Diligence Inventory V1

Date: 2026-09-17
Base source reviewed: `0238cd994e381cc07ef0072137412829921a45d5`

## Purpose

Reduce acquisition/due-diligence friction by separating repository-observable facts from legal/ownership facts that still require attributable documentation.

This inventory is not a legal opinion and does not establish chain-of-title by itself.

## 1. Repository facts observed

- GitHub repository: `renanescola40-afk/eurocomply_saas`.
- Repository visibility observed: `public`.
- Default branch: `main`.
- `main` is branch-protected.
- Current reviewed source SHA: `0238cd994e381cc07ef0072137412829921a45d5`.
- Top-level `CODEOWNERS` exists.
- Top-level `README.md` exists.
- Top-level `SECURITY.md` exists.
- `package.json` has `"private": true`.
- `package-lock.json` exists.
- `bun.lock` also exists.
- No top-level file named `LICENSE` was observed in the root listing reviewed on 2026-09-17.
- No repository search result for an explicit SBOM/CycloneDX/SPDX artifact was found in the search performed for this inventory.
- Security tooling/configuration is present, including Gitleaks/Semgrep-related repository files and multiple supply-chain/security scripts.

## 2. What these facts do NOT prove

The observations above do not independently prove:

- who legally owns all copyright in the source code;
- whether every contributor assigned rights;
- whether any contractor/employee contribution needs a separate assignment;
- trademark ownership/registration;
- domain registrant/beneficial ownership;
- ownership of regulatory mappings/templates/content;
- absence of third-party proprietary code;
- legal sufficiency of open-source compliance;
- legal effect of repository publication without a top-level LICENSE;
- acquisition-safe chain-of-title.

## 3. Acquisition data-room requirements

### A. Source-code ownership

Required attributable evidence:

- creator/founder statement of authorship and contribution history;
- company ownership/assignment instrument where required by the chosen ownership model;
- contributor list;
- employee/contractor contribution agreements or assignments where applicable;
- list of material repositories and branches;
- statement identifying whether any code originated outside the company/founder development process.

Status: `OPEN_DOCUMENTARY`

### B. Repository provenance

Current signals:

- long-form Git history exists;
- protected `main` exists;
- CODEOWNERS exists;
- security/release workflows exist;
- signed/verified GitHub merge commits are present in current lineage.

Required final acquisition artifact:

- release-provenance summary;
- material contributor map;
- current canonical source SHA;
- current Production SHA;
- explanation of branch/release governance;
- statement of any imported/migrated historical repository material.

Status: `PARTIAL_ADVANCED`

### C. Open-source / third-party dependency rights

Current signals:

- deterministic package lockfile exists;
- package manifest exists;
- supply-chain checks exist in source;
- package is marked private.

Required final acquisition artifact:

- complete dependency inventory;
- transitive dependency inventory;
- license classification;
- copyleft/restricted-license review;
- third-party notices where required;
- current SBOM in a standard format such as SPDX or CycloneDX if adopted;
- policy for dependency approval/upgrades.

Status: `OPEN_FORMAL_INVENTORY`

### D. Repository licensing/publication boundary

Observed:

- repository is public;
- no top-level `LICENSE` file was observed in the reviewed root listing.

Required decision:

- qualified review of intended source-publication/licensing posture;
- confirm whether the repository should remain public after the current exact-SHA Enterprise closure;
- if visibility changes, execute only through a controlled release/integration plan to avoid breaking CI/CD/provider bindings;
- do not add a software license merely to make diligence look complete without an owner/legal decision.

Status: `OPEN_OWNER_LEGAL_DECISION`

### E. Domain / brand / trademark

Observed operationally:

- Production domains include `risckcomply.com` and `www.risckcomply.com` in the connected deployment project.

Required attributable evidence:

- domain registrar account/control evidence;
- registrant/legal holder evidence where applicable;
- renewal status;
- DNS/control evidence;
- RISCK COMPLY brand/trade-name ownership evidence;
- trademark search/registration status;
- logo/design ownership evidence.

Status: `OPEN_DOCUMENTARY`

### F. Regulatory/compliance content ownership

Material product value may exist in:

- AI Act mappings;
- governance templates;
- risk/classification workflows;
- evidence structures;
- procurement/security/privacy templates;
- compliance documentation logic.

Required acquisition evidence:

- authorship/source register;
- public-source attribution register where relevant;
- confirmation that third-party publications are not reproduced beyond permitted use;
- list of licensed/external source materials;
- ownership status for proprietary mappings/templates.

Status: `OPEN_FORMAL_REGISTER`

### G. AI-assisted development provenance

The repository contains agent-related documentation/logs and has been developed with AI-assisted workflows.

Required acquisition artifact:

- AI-assisted development policy;
- statement that generated code is subject to human/repository review, testing and security gates;
- process for avoiding insertion of confidential third-party code or unverified copyrighted material;
- provenance handling for material generated assets/content where appropriate.

Status: `OPEN_POLICY_ARTIFACT`

## 4. Recommended no-core closure artifacts

These artifacts can be prepared without changing runtime product behavior:

1. `IP_CHAIN_OF_TITLE_INDEX.md`
2. `CONTRIBUTOR_PROVENANCE_REGISTER.md`
3. `DOMAIN_AND_BRAND_OWNERSHIP_INDEX.md`
4. `THIRD_PARTY_AND_OPEN_SOURCE_REGISTER.md`
5. `SBOM` export for the accepted release
6. `AI_ASSISTED_DEVELOPMENT_PROVENANCE_POLICY.md`
7. `REGULATORY_CONTENT_SOURCE_REGISTER.md`
8. acquisition-facing `SOURCE_AND_RELEASE_PROVENANCE.md`

The final legal/ownership conclusions still require attributable owner/entity documentation and, where appropriate, qualified legal review.

## 5. Immediate valuation effect

Current acquisition/IP state is not zero: repository provenance, protected source, lockfiles and security controls are real assets.

However, until documentary chain-of-title, dependency/license inventory, domain/brand ownership and regulatory-content provenance are frozen, an acquirer would reasonably apply diligence friction/discount.

`IP_DEFENSIBILITY_CURRENT=PARTIAL_ADVANCED_TECHNICAL`

`IP_CHAIN_OF_TITLE_FINAL=OPEN_DOCUMENTARY`

`ACQUISITION_IP_DILIGENCE=NOT_TERMINAL`

## 6. Safety boundary

Do not:

- change repository visibility during exact-SHA Production closure without a controlled plan;
- add a software license without an explicit ownership/legal decision;
- claim trademark registration not evidenced;
- infer company ownership solely from GitHub account ownership;
- infer domain legal ownership solely from DNS/deployment control;
- claim SBOM completeness until an actual SBOM artifact is generated and reviewed.
