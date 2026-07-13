# Decision: distinguish framework errors from legitimate security copy

Date: 2026-07-13

## Context

The Full Security Suite failed seven public-route tests even though the affected pages returned healthy content:

- the subprocessors page described Sentry data as including "stack traces";
- the route-health detector matched the substring `Stack trace` anywhere in the body and classified that legitimate provider description as a raw framework error;
- the English Trust Center metadata used an honest buyer-oriented description, but omitted every semantic keyword required by the public SEO contract.

The same production-like E2E suite passed in the Enterprise Production Gate, while the broader Full Security Suite exposed these deterministic contract mismatches.

## Decision

Keep the route-health control fail-closed for real framework disclosures, but match `Stack trace` only when it appears as a standalone error heading or line. Continue blocking explicit runtime-error markers such as `Unhandled Runtime Error`, `Application error`, `ReferenceError:`, `TypeError:`, `SyntaxError:` and `webpack-internal`.

Update the English Trust Center subtitle and generated meta description to explicitly reference current security controls and the Trust Center. The language remains conservative and does not add certification, audit or compliance claims.

## Impact

This change affects public-route test accuracy and English Trust Center copy only. It does not change authentication, authorization, data access, databases, infrastructure, secrets, deployments or customer records.

## Risks and tradeoffs

A very unusual application error that prints the words `stack trace` only inside a prose sentence may not match that marker. The other explicit runtime and framework markers remain enforced, and a genuine standalone Stack trace heading still fails the gate.

The Trust Center description becomes slightly longer but remains within normal search metadata usage and better reflects the page content.

## Validation

The authoritative validation is the pull request CI, especially:

- Full Security Suite production-like Playwright E2E;
- Enterprise Production Gate;
- public SEO and route-health Playwright tests;
- lint, typecheck, unit tests and build;
- CodeQL, Semgrep, Gitleaks and Vercel preview.

This record does not claim a runtime audit, pentest or external assessment.

## Rollback

Revert the pull request. No data, credential, infrastructure or deployment rollback is required.
