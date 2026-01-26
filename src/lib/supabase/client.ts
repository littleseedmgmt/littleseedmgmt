import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Singleton pattern - create client once and reuse
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (!supabaseClient) {
    console.log('[Supabase] Creating new browser client')
    supabaseClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return supabaseClient
}
