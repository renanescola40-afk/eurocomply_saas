# Security decision: scan the complete pull request API diff

**Date:** 2026-07-13  
**Status:** Implemented in draft PR  
**Area:** CI security / API endpoint hardening

## Context

The API endpoint hardening script entered pull request mode when `GITHUB_EVENT_NAME=pull_request`, but discovered changed routes with `git diff --name-only HEAD^ HEAD`. That range covers only the latest commit. In a multi-commit pull request, an API route changed in an earlier commit could therefore be omitted from the focused hardening scan.

The broader security suite still contained other controls, so this was not evidence of an exploited vulnerability. It was a concrete fail-open weakness in the change-detection boundary of a security gate.

## Decision

Resolve the complete pull request range from GitHub-provided base metadata, trying:

1. `GITHUB_BASE_SHA`;
2. `origin/$GITHUB_BASE_REF`;
3. `$GITHUB_BASE_REF`.

Run Git with `execFileSync` and positional arguments rather than constructing a shell command.

When none of the base references is available in a shallow checkout, do not fall back to the previous one-commit range. Run the full API endpoint scan instead.

## Security impact

- Multi-commit pull requests can no longer hide earlier API route changes from the focused endpoint hardening gate.
- Missing base history produces a slower full scan, not a silent reduction in coverage.
- No runtime application behavior, data model, environment variable, customer data, or production configuration changes.

## Validation

A Vitest contract test asserts that the script uses GitHub base metadata, does not restore the `HEAD^ HEAD` range, uses argument-based Git execution, and retains the fail-safe full-scan fallback.

GitHub Actions results on the draft pull request are the authoritative execution evidence. No production runtime validation is claimed because this change only affects repository CI behavior.

## Risk

Low. The main operational risk is additional CI time when a shallow checkout cannot resolve the pull request base. That is intentional: complete coverage is preferred to a partial security scan.

## Rollback

Revert the pull request. No database, environment, deployment, or customer-data rollback is required.
