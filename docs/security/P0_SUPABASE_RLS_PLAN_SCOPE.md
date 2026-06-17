# P0 Supabase RLS Plan Scope

The Supabase live RLS plan covers tenant-boundary behavior for client-accessible tables.

A table should be included when:

- It stores tenant-scoped business data.
- It can be accessed through client-side or user-context paths.
- It depends on row-level security for data-boundary enforcement.

A table may be documented outside the live plan when:

- It is public by design.
- It is service-only and has no client-side access path.
- It is not tenant-scoped.

Each exclusion needs a rationale in the final runtime evidence file.
