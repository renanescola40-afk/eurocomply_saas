# P1 Final Gate

This gate keeps P1 completion conservative.

Preparation workflows can exist before production evidence is available. A P1 control should only be marked `Complete` after its final evidence file exists and the P1 enterprise security register points to that same path.

Run locally:

```bash
node scripts/security/check-p1-final-gate.mjs
```
