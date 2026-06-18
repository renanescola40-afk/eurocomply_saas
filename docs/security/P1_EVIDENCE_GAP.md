# P1 Evidence Gap

This report shows how many final P1 evidence files are present.

Run:

```bash
node scripts/security/report-p1-evidence-gap.mjs
```

Strict mode fails when any final evidence file is missing:

```bash
node scripts/security/report-p1-evidence-gap.mjs --strict
```

This report does not create evidence and does not mark controls complete.
