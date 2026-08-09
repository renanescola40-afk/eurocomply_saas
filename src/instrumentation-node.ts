// This module is imported from the shared Next.js instrumentation entrypoint,
// which is compiled for both Node.js and Edge. Keep it free of Node-only
// built-ins so the Edge instrumentation bundle remains buildable.
//
// Provider-specific environment aliases are normalized here before Sentry reads
// runtime configuration. Local `.env.user` loading must happen outside this
// shared instrumentation path because filesystem imports would be bundled into
// the Edge instrumentation build.
const mapFallbacks: Record<string, string[]> = {
  // Server-side database URL.
  DATABASE_URL: [
    process.env.SUPABASE_URL ?? '',
    process.env.POSTGRES_URL ?? '',
    process.env.POSTGRES_PRISMA_URL ?? '',
  ],
  // Supabase service-role credential.
  DATABASE_SERVICE_ROLE_KEY: [process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''],
  // Public client URL for browser-side Supabase clients.
  NEXT_PUBLIC_SUPABASE_URL: [
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_URL ?? '',
  ],
  // Public publishable/anon key aliases only; never map database credentials.
  NEXT_PUBLIC_SUPABASE_ANON_KEY: [
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_KEY ?? '',
    process.env.SUPABASE_PUBLISHABLE_KEY ?? '',
    process.env.SUPABASE_KEY ?? '',
    process.env.SUPABASE_ANON_KEY ?? '',
  ],
  // PostgREST compatibility alias.
  POSTGREST_API_KEY: [
    process.env.POSTGREST_API_KEY ?? '',
    process.env.SUPABASE_JWT_SECRET ?? '',
  ],
};

for (const [target, fallbacks] of Object.entries(mapFallbacks)) {
  if (process.env[target]) continue;

  for (const value of fallbacks) {
    if (!value) continue;
    process.env[target] = value;
    break;
  }
}

export {};
