# Testing Strategy

EuroComply should treat tests as a production-readiness requirement.

## Test Layers

### Unit tests

Cover pure business logic:

- compliance score thresholds
- Zod validation schemas
- permission helpers
- risk score calculations
- billing plan limits

### Integration tests

Cover server-side behavior:

- organization creation
- membership creation
- compliance task creation
- vendor creation
- risk creation
- audit log creation

### End-to-end tests

Cover critical user journeys:

- sign up and create organization
- invite team member
- create compliance task
- upload evidence
- create vendor
- create risk
- upgrade subscription

## Priority

1. Add Vitest for unit tests.
2. Add tests for dashboard score helpers.
3. Add tests for validation schemas.
4. Add Playwright for critical journeys.
5. Run tests in CI before build.
