# RISCK COMPLY — Public Legal Surface Revalidation

Date: 2026-09-01  
Scope: public/runtime presence only  
Legal effect: none

## Result

```text
LEGACY_PUBLICATION_SURFACE_TECHNICAL=PASS
LEGACY_PUBLICATION_CATEGORIES_PRESENT=8/8
LEGACY_LEGAL_PUBLICATION_8_OF_8=HUMAN_BLOCKER
QUALIFIED_LEGAL_APPROVAL=NOT_INFERRED
```

This check closes only the technical/public-surface presence question. It does not convert review drafts into approved legal documents and does not replace qualified Counsel.

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

A current localized Production `transfers` surface is publicly observable.

It is versioned as a review draft, keeps the effective date pending qualified legal approval, and explicitly refuses to infer SCC/DPA/transfer mechanisms from code, runtime or billing evidence.

### 5. Cookie Policy — PRESENT

A current localized Production `cookie-policy` surface is publicly observable.

It is versioned as a review draft with effective date pending qualified legal approval and describes optional analytics consent/withdrawal without claiming a signed legal agreement.

### 6. Subprocessor Register — PRESENT

A current localized Production `subprocessors` surface is publicly observable.

It distinguishes current provider/runtime evidence from final contractual/legal approval and retains unresolved provider/account evidence where appropriate.

### 7. Acceptable Use Policy — PRESENT

A current localized Production `acceptable-use` surface is publicly observable.

It is versioned `0.1-review`, with effective date pending qualified legal approval and publication status `REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED`.

### 8. Security / TOMs disclosure — PRESENT

A current public Production Security surface is observable.

It describes access control, tenant isolation, encryption posture, audit, backup/availability and incident-response boundaries while explicitly stating that formal external assurance is pending and avoiding unsupported certification claims.

## Fail-closed interpretation

The eight public categories are now technically present as customer/procurement review surfaces. The legal/publication acceptance gate remains open because presence is not legal approval.

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
LEGAL_PUBLICATION_ACCEPTANCE=HUMAN_BLOCKER
```

No certification, regulator approval, legal opinion or compliance guarantee is created by this revalidation.
