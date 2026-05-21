"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

// Use ONLY in 'use client' components
// Only has access to NEXT_PUBLIC_ env vars — no secrets
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
