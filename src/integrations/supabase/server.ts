// This file is protected and cannot be modified.
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.DATABASE_URL || process.env.SUPABASE_URL || process.env.POSTGRES_URL || "",
  process.env.DATABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);