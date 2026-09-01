# RISCK COMPLY — Public Legal Surface Revalidation

Date: 2026-09-01  
Scope: public/runtime presence only  
Legal effect: none  
Production release observed: `4a3bbaa6e7ee459f444650305a8de16bc87b74f9`

## Result

```text
LEGACY_PUBLICATION_SURFACE_TECHNICAL=PASS
LEGACY_PUBLICATION_CATEGORIES_PRESENT=8/8
LEGACY_PUBLICATION_PT_ROUTES_DIRECT_200=8/8
LEGACY_LEGAL_PUBLICATION_8_OF_8=HUMAN_BLOCKER
QUALIFIED_LEGAL_APPROVAL=NOT_INFERRED
```

This check closes only the technical/public-surface presence question. It does not convert review drafts into approved legal documents and does not replace qualified Counsel.

## Direct Production route matrix

| Category | Production route | Direct result | Legal boundary |
|---|---|---:|---|
| Terms of Service | `/pt/terms` | HTTP 200 | Production draft; not qualified legal advice. |
| Privacy Policy | `/pt/privacy` | HTTP 200 | Informational/review surface; final legal use remains gated. |
| DPA | `/pt/dpa` | HTTP 200 | Public summary/review surface; not the final signed DPA. |
| International Transfers / SCC | `/pt/transfers` | HTTP 200 | `0.1-review`; effective date pending qualified legal approval; no SCC/DPA inferred without evidence. |
| Cookie Policy | `/pt/cookie-policy` | HTTP 200 | Review draft; effective date pending qualified legal approval. |
| Subprocessor Register | `/pt/subprocessors` | HTTP 200 | Public evidence/review surface; account-level contractual facts remain separately gated. |
| Acceptable Use Policy | `/pt/acceptable-use` | HTTP 200 | `0.1-review`; `REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED`. |
| Security / TOMs disclosure | `/pt/security` | HTTP 200 | Formal external assurance explicitly remains pending. |

The current public pages expose Production release metadata bound to:

```text
4a3bbaa6e7ee459f444650305a8de16bc87b74f9
```

## Observed categories

### 1. Terms of Service — PRESENT

Observed public Production surface: `/pt/terms`.

The page identifies itself as production draft Terms and states that RISCK COMPLY does not replace qualified legal, tax or regulatory advice.

### 2. Privacy Policy — PRESENT

Observed public Production surface: `/pt/privacy`.

The page states that it is informational, should be reviewed with Counsel before final legal use, and that public legal materials remain review drafts until founder facts and qualified Counsel decisions pass the publication gate.

### 3. DPA — PRESENT

Observed public Production surface: `/pt/dpa`.

The page is explicitly a public DPA summary, states that final terms should be reviewed/signed during Enterprise contracting, and states that it is not the final signed legal addendum.

### 4. International Transfers / SCC boundary — PRESENT

Direct Production request to `/pt/transfers` returned HTTP 200.

It is versioned `0.1-review`, keeps the effective date pending qualified legal approval, is marked `REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED`, and explicitly refuses to infer SCC/DPA/transfer mechanisms from code, runtime, provider binding or billing evidence.

### 5. Cookie Policy — PRESENT

Direct Production request to `/pt/cookie-policy` returned HTTP 200.

It is versioned as a review draft with effective date pending qualified legal approval and describes optional analytics consent/withdrawal without claiming a signed legal agreement.

### 6. Subprocessor Register — PRESENT

Direct Production request to `/pt/subprocessors` returned HTTP 200.

It distinguishes current provider/runtime evidence from final contractual/legal approval and retains unresolved provider/account evidence where appropriate.

### 7. Acceptable Use Policy — PRESENT

Direct Production request to `/pt/acceptable-use` returned HTTP 200.

It is versioned `0.1-review`, with effective date pending qualified legal approval and publication status `REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED`. It explicitly states that it is not a signed agreement or qualified legal opinion.

### 8. Security / TOMs disclosure — PRESENT

Direct Production request to `/pt/security` returned HTTP 200.

It describes access control, tenant isolation, encryption posture, audit, backup/availability and incident-response boundaries while explicitly stating that formal external assurance remains pending. The page also states that public legal materials remain informational review drafts until signed founder facts and qualified Counsel decisions pass the exact-SHA publication gate.

## Fail-closed interpretation

The eight public categories are now directly runtime-verified as customer/procurement review surfaces. The legal/publication acceptance gate remains open because presence is not legal approval.

The following still require qualified human evidence where applicable:

- final document versions and effective dates;
- correct final contracting/operator entity facts;
- final DPA and transfer mechanism positions;
- final subprocessor contractual facts;
- final cookie/privacy conclusions;
- final Terms/AUP linkage and governing-law/commercial positions;
- final TOM exhibit / contractual security commitments;
- qualified Counsel acceptance bound to the exact final versions/release.

Therefore:

```text
PUBLIC_SURFACE_EXISTENCE=TECHNICALLY_CLOSED
PUBLIC_PT_RUNTIME_8_OF_8=PASS
LEGAL_PUBLICATION_ACCEPTANCE=HUMAN_BLOCKER
```

No certification, regulator approval, legal opinion or compliance guarantee is created by this revalidation.
