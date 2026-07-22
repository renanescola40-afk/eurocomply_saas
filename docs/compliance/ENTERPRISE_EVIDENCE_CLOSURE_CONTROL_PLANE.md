# Enterprise Evidence Closure Control Plane

## Purpose

This control plane closes the gap between merged implementation and evidence-backed Enterprise completion. It does not manufacture proof, convert placeholders into evidence, or replace qualified legal, technical, statistical or fundamental-rights review.

## Operating model

1. Run the report workflow on every relevant pull request and `main` push.
2. Download the exact-SHA gap report artifact.
3. Execute the required runtime proof in an isolated production-like environment.
4. Store raw logs outside the repository according to the evidence retention policy.
5. Create a staged JSON package using the runtime or human-review template.
6. Replace every template value and calculate the retained package digest.
7. Run `prepare-enterprise-evidence-promotion.mjs` for one registry requirement.
8. Review the generated promotion bundle.
9. Open a dedicated evidence PR containing only the accepted package and supporting documentation.
10. Run the protected strict workflow before promoting the final score.

## Commands

```bash
node scripts/compliance/generate-enterprise-evidence-gap-report.mjs
node scripts/compliance/validate-enterprise-evidence-closure.mjs
EVIDENCE_EXACT_SHA=<full-sha> node scripts/compliance/prepare-enterprise-evidence-promotion.mjs <requirement-id> <staged-json>
```

## Fail-closed rules

- full lowercase 40-character Git SHA;
- exact SHA must match the evaluated release;
- runtime proof cannot be older than 90 days;
- placeholders and example-only content are rejected;
- runtime packages require named assertions and environment information;
- human reviews require a named reviewer and relevant qualification;
- every accepted package requires an integrity digest;
- missing or invalid evidence never receives completion credit;
- the strict closure workflow runs only in the protected `enterprise-runtime-proof` environment.

## Evidence truth boundary

A green report job means the control-plane code is healthy. Only the protected strict job can state that all registered evidence is present and structurally accepted. Even that result is not certification, regulator approval, a legal opinion, or a guarantee that a customer is compliant.
