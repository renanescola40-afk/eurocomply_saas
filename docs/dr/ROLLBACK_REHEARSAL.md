# Rollback Rehearsal — 2026-10-03

## Non-destructive Vercel evidence
Current production deployment:
- deployment: `dpl_Ew8oT6HU7PzrrFtnqjEQuVgUq9ow`
- state: READY
- target: production
- Git ref: main
- Git SHA: `1411d8f4ac861ab32bb61ca55648cfcc5af8f15a`
- provider flag: rollback candidate = true

Additional earlier production deployments observed as READY and rollback candidates include:
- `dpl_BWDWVijsqvtUJKEvhTYtC9Ddqufd` — SHA `24a7fb66e907242536141cecabdfc861565e29af`
- `dpl_7MygY5awR7AaL1dnuqDcXwQB66JX` — SHA `21e08b45edca12df8aecd2920b4e1ae41c93ddd0`
- `dpl_2hTqhmUFqNrJdFbwJYfEiJ6QhHB1` — SHA `deaf9847fb84027fb0c69e9584298ac54cac7449`

## Safety boundary
No rollback was executed against production. DNS/domain bindings and production environment variables were not changed.

## Classification
KNOWN_GOOD_DEPLOYMENT_IDENTIFICATION=PROVEN
ROLLBACK_CANDIDATE_AVAILABILITY=PROVEN
ROLLBACK_EXECUTION=NOT_EXECUTED_BY_DESIGN
ROLLBACK_READINESS=FORMALLY_REHEARSED_NON_DESTRUCTIVELY
