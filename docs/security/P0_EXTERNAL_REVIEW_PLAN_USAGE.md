# External Review Plan Usage

Use this plan before creating the final external review runtime evidence file.

## Files

- Template: `docs/security/evidence/templates/external-review-plan.template.json`
- Checker: `scripts/security/check-p0-external-review-plan.mjs`
- Final evidence target: `docs/security/evidence/runtime/external-security-review-or-pentest.json`

## Workflow

1. Copy the template to a private working file or runtime plan file.
2. Replace placeholders with approved reviewer, review type, scope summary, and evidence references.
3. Do not add private findings, exploit details, customer data, or unredacted attachments.
4. Run:

```bash
node scripts/security/check-p0-external-review-plan.mjs path/to/plan.json
```

5. Complete the independent review or document the approved private beta exception.
6. Store redacted evidence in the approved evidence location.
7. Fill `docs/security/evidence/runtime/external-security-review-or-pentest.json` from the runtime evidence template.
8. Run the P0 runtime evidence checkers before opening the final evidence PR.

The plan itself does not close the P0 runtime evidence item. It only standardizes what must be reviewed or approved.
