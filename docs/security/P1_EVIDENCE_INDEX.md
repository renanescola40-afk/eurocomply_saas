# P1 Evidence Index

The P1 evidence index tracks the 10 final P1 evidence files and their review status.

Validate it with:

```bash
node scripts/security/check-p1-evidence-index.mjs
```

The index starts with every control set to `Open`. Mark a control as `Complete` only after the final evidence file exists and has been reviewed.

The index does not create evidence and does not mark controls complete automatically.
