# Provider interoperability security boundary

The provider interoperability workflow is intentionally read only.

It may retrieve provider metadata required to establish configuration health, but it must not:

- create or modify Supabase users, sessions, projects or database records;
- create Stripe customers, prices, payments, refunds or webhook endpoints;
- create Sentry events, releases, projects or organization resources;
- print or persist credential values;
- include provider account identifiers or account email addresses in artifacts;
- weaken branch protection, required checks, deployment protection or provider access controls.

Any future expansion from metadata proof to transaction proof requires a separate workflow, isolated test resources, cleanup guarantees and explicit evidence boundaries.
