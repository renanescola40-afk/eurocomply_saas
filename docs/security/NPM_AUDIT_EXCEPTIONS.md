# npm Audit Metadata Exceptions

The security CI fails on every npm advisory at moderate severity or higher unless
`scripts/security/run-npm-audit-gate.mjs` proves that it matches a narrow,
time-limited scanner-metadata exception.

## GHSA-mh99-v99m-4gvg

- Package: `brace-expansion`
- Allowed release: `1.1.17`
- npm integrity: `sha512-w+aeW/mkgM4PyRMOJCgi3fOrTm5Q8QY1OSfn2TO2iuDj3ezIHqejmuxbjfPrqUkgqRew1iqkyAn0tr0ZwHD9+w==`
- Expiration: `2026-08-05T23:59:59.000Z`
- Reason: npm published the 1.x security backport after the advisory metadata was
  created. The release implements `EXPANSION_MAX_LENGTH` for CVE-2026-14257,
  while the scanner still reports the original broad `<=5.0.7` range.
- Compensating controls: exact lockfile version and integrity verification,
  root-advisory graph validation, automatic expiration, and fail-closed handling
  for every different advisory or artifact.

Remove this exception as soon as the npm advisory metadata recognizes the 1.x
backport. Do not extend the expiry without a new source and artifact review.
