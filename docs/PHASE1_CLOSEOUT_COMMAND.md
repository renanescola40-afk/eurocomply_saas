# Phase 1 Closeout Command

Use this command after generating the lockfile and all Phase 1 evidence logs:

```bash
npm run phase1:closeout
```

The command runs:

```bash
npm run phase1:evidence && npm run phase1:check
```

It is the final repository-side gate before reviewing `docs/PHASE1_CLOSEOUT_CHECKLIST.md`.

Phase 1 is still incomplete until the command passes against real committed evidence.
