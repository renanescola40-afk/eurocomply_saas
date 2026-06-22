# P1 Audit Chain Evidence Workflow

This workflow prepares validation for the P1 audit chain control.

## Final evidence path

Use this final evidence path when production evidence is available:

```text
docs/security/evidence/p1/verifiable-production-audit-chain.json
```

The template is available at:

```text
docs/security/evidence/p1/verifiable-production-audit-chain.template.json
```

## Validation

Run locally:

```bash
node scripts/security/check-p1-audit-chain-evidence.mjs
```

The checker exits successfully when final evidence is not present, because the control remains open until production evidence is collected and the P1 register is updated.

When final evidence is present, the checker validates:

- metadata and redaction statement;
- covered systems and event classes;
- chain segment continuity checks;
- required verification controls;
- exception metadata when the control is not complete.

## Completion requirements

Do not mark this control complete until the final evidence file is committed and the P1 enterprise security register points to the same final evidence path.
