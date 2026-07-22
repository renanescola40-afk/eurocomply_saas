# ADR: Separate EU AI Act Product Coverage from Enterprise Readiness

- **Date:** 2026-07-22
- **Status:** Accepted for implementation

## Context

The repository had two independent progress concepts but they were repeatedly reported as one number:

1. EU AI Act product workflow coverage;
2. Enterprise technical, runtime and release readiness.

The product scorecard remained at 50% after multiple functional Mega PRs were merged, while the enterprise score remained at 46% because exact-SHA runtime and independent assurance evidence was still missing. Repeating only the enterprise percentage made real product implementation invisible; increasing it from merged code alone would have falsified runtime readiness.

## Decision

Maintain separate exact-SHA scores:

- **Implementation coverage:** required product files exist;
- **CI-verified coverage:** implementation and required automated tests exist;
- **Runtime evidence coverage:** required retained runtime evidence also exists;
- **Completed coverage:** all runtime and required qualified human reviews exist.

The canonical registry totals 100 weighted points across the 16 workstreams in the product coverage prompt.

## Fail-closed rules

- missing implementation earns no downstream credit;
- missing tests prevents CI credit;
- missing runtime evidence prevents runtime credit;
- missing qualified review prevents completion credit;
- one score can never be substituted for another;
- 100% completion is possible only with `EU_AI_ACT_PRODUCT_COVERAGE_GO`;
- the report is not a legal-compliance guarantee, certification or regulator approval;
- repository paths are evidence pointers, not proof that customer facts or legal conclusions are true.

## Consequences

Every pull request and `main` push produces a retained exact-SHA report. New implementation can raise implementation and CI coverage immediately when its evidence is present. Runtime and human-review percentages remain unchanged until their own evidence exists.

The previous hand-maintained Markdown scorecard becomes historical context rather than the live calculation authority.
