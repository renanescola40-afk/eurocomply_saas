# RISCK COMPLY — Open Source License Diligence

Date: 2026-09-24  
Source: current `package-lock.json` on `main`  
Lockfile version: 3  
Package entries reviewed: 940  
Unknown/missing license metadata in lockfile: 0  
Status: `OPEN_SOURCE_DILIGENCE=PASS_INVENTORY / LEGAL_LICENSE_OPINION_NOT_CLAIMED`

## License inventory summary

| License expression | Package entries |
| --- | ---: |
| MIT | 754 |
| Apache-2.0 | 58 |
| ISC | 34 |
| BSD-2-Clause | 16 |
| MPL-2.0 | 13 |
| Apache-2.0 AND MIT | 11 |
| BSD-3-Clause | 11 |
| LGPL-3.0-or-later | 10 |
| FSL-1.1-MIT | 9 |
| BlueOak-1.0.0 | 8 |
| MIT-0 | 3 |
| Apache-2.0 AND LGPL-3.0-or-later | 3 |
| 0BSD | 2 |
| CC0-1.0 | 2 |
| Apache-2.0 AND LGPL-3.0-or-later AND MIT | 1 |
| Python-2.0 | 1 |
| CC-BY-4.0 | 1 |
| (MPL-2.0 OR Apache-2.0) | 1 |
| (MIT OR CC0-1.0) | 1 |
| MIT AND ISC | 1 |

## Copyleft/review-sensitive entries

Current lockfile contains LGPL-bearing optional/native `sharp/libvips` packages, including platform-specific `@img/sharp-libvips-*` packages and `@img/sharp-*` packages with combined Apache/MIT/LGPL expressions.

Classification: `KNOWN_REVIEW_ITEM`, not an automatic conflict.

No AGPL/GPL-only package was identified from the current lockfile license metadata during this inventory. This is a factual lockfile observation, not an external legal opinion and not a guarantee that every artifact has no additional notice/source obligations.

## Buyer-safe statement

RISCK COMPLY maintains a lockfile-derived dependency/license inventory and SBOM generation path. No missing license metadata was found in the current lockfile inventory. Review-sensitive LGPL-bearing image-processing dependencies are explicitly recorded rather than hidden. No external counsel opinion on license compatibility is claimed.

## Required maintenance

- regenerate this inventory whenever `package-lock.json` materially changes;
- generate/review the release SBOM for the accepted SHA;
- review new copyleft/restrictive/custom licenses before release;
- preserve required notices/source-offer obligations where applicable;
- keep SCA/SAST/CodeQL/secret-scanning status separate from license compatibility.

```text
UNKNOWN_LICENSES=0
KNOWN_LICENSE_REVIEW_ITEMS=LGPL_SHARP_LIBVIPS
NO_KNOWN_LICENSE_CONFLICT=NOT_CLAIMED_WITHOUT_LEGAL_REVIEW
OPEN_SOURCE_DILIGENCE=PASS_INVENTORY
```
