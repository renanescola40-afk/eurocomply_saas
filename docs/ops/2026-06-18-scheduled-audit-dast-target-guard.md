# Scheduled audit: DAST target guard

## Result

A safe non-breaking hardening patch was prepared on branch `audit-dast-target-guard`.

## Finding

The `P1 DAST Baseline` workflow allowed manual `workflow_dispatch` runs against any `https://` URL. That is broader than necessary for EuroComply and could allow the workflow to be used as a generic scanner.

## Action

Updated `.github/workflows/p1-dast-baseline.yml` so manual targets must match approved EuroComply HTTPS URLs:

- `https://eurocomply-saas.vercel.app`
- paths under `https://eurocomply-saas.vercel.app/*`
- subdomains under `https://*.eurocomply-saas.vercel.app/*`

## Safety

This does not change the default production DAST target, schedule, artifact output, permissions, or scan command. It only narrows manual override input validation.

## Follow-up

Merge after CI passes. The canonical action log should also include this item in `agent_log.json` once the audit-log update can be safely applied through PR review.
