import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const parseEnvLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const eqIndex = trimmed.indexOf("=");
  if (eqIndex <= 0) return null;

  const key = trimmed.slice(0, eqIndex).trim();
  const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");

  if (!key) return null;
  return { key, value };
};

const envUserPath = join(process.cwd(), ".env.user");
if (existsSync(envUserPath)) {
  const content = readFileSync(envUserPath, "utf-8");
  for (const line of content.split("\n")) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    if (!(parsed.key in process.env)) {
      process.env[parsed.key] = parsed.value;
    }
  }
}

// Map common provider-specific env names to the canonical names used by the app
// This helps when deploying (e.g. Vercel auto-generated Supabase vars) without
// requiring manual renaming in the dashboard.
const mapFallbacks: Record<string, string[]> = {
  // server-side DB URL
  DATABASE_URL: [
    process.env.SUPABASE_URL ?? '',
    process.env.POSTGRES_URL ?? '',
    process.env.POSTGRES_PRISMA_URL ?? ''
  ],
  // supabase service role
  DATABASE_SERVICE_ROLE_KEY: [process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''],
  // public client URL for client-side supabase
  NEXT_PUBLIC_DATABASE_URL: [process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_URL ?? ''],
  // public publishable key
  NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY: [process.env.SUPABASE_PUBLISHABLE_KEY ?? '', process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''],
  // postgrest compatibility
  POSTGREST_API_KEY: [process.env.POSTGREST_API_KEY ?? '', process.env.SUPABASE_JWT_SECRET ?? ''],
  // stripe placeholders left to the user — do not auto-map sensitive keys
};

for (const [target, fallbacks] of Object.entries(mapFallbacks)) {
  if (!process.env[target]) {
    for (const val of fallbacks) {
      if (val) {
        process.env[target] = val;
        break;
      }
    }
  }
}

export {};
