# Health proof runbook

Current P0 progress remains 50% Complete / 50% remaining until a real network proof artifact is generated and reviewed.

Use this runbook when running the manual `Deployment Health Proof` GitHub Actions workflow.

## Required inputs

- `deployment_url`: enter the full HTTPS application URL, including the `https://` prefix.
- `include_promoted_register`: set to `true` when you want the workflow artifact to include a promoted copy of the P0 register for review.

## Common failure: `Invalid URL`

This means the workflow did not receive a valid `deployment_url` value. Re-run the workflow and paste the full preview or production URL from the Vercel comment or project dashboard.

Valid shape:

```text
https://your-project.example.app
```

Do not enter only a hostname, do not leave the field blank, and do not use `http://`.

## What success produces

A passing run uploads the `deployment-health-validation` artifact. Review and promote the generated evidence only after the run performs a live HTTPS request and returns a successful health response.

Do not mark the P0 register row Complete from URL presence alone.
