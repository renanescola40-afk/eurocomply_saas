# P0 Supabase RLS Plan Review Checklist

Before collecting final runtime evidence, review the plan for:

- [ ] Every client-accessible tenant-scoped table is listed.
- [ ] Every listed table has a tenant boundary column.
- [ ] Every listed table includes cross-boundary read denial coverage.
- [ ] Every listed table includes same-boundary allowed coverage.
- [ ] Write coverage is included or explicitly explained.
- [ ] Server-only paths are documented separately.
- [ ] No private runtime values are stored in the plan.

The completed plan should be attached to the release evidence trail or referenced from the final runtime evidence JSON.
