# P1-06 no production secrets note

The SBOM + artifact attestation workflow intentionally does not require production application credentials.

The reviewed workflow run generated supply-chain evidence from the repository dependency graph and lockfile using GitHub Actions. It did not require provider credentials for Vercel, Supabase, Stripe, or other production systems.

This note supports the governance claim that P1-06 evidence is supply-chain evidence, not a runtime production secret test.
