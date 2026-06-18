# DAST target guard PR summary

## Scope

This PR narrows the manual target override for `.github/workflows/p1-dast-baseline.yml`.

## Why

The previous workflow accepted any `https://` value for `workflow_dispatch.inputs.target_url`. That is unnecessary for EuroComply and could let the workflow be misused as a generic scanner.

## Safety

- Default target remains `https://eurocomply-saas.vercel.app`.
- Scheduled run remains weekly.
- Push and pull request triggers remain path-scoped.
- Artifact generation and ZAP command remain unchanged.
- Workflow permissions remain `contents: read`.

## Audit record

Prepared structured audit-log append data in `agent_log_patch_2026_06_18.json` for folding into `agent_log.json` during review.
