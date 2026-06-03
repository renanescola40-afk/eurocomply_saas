import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: {
          getItem(name: string) {
            return cookieStore.get(name)?.value ?? null
          },
          setItem(name: string, value: string) {
            cookieStore.set(name, value)
          },
          removeItem(name: string) {
            cookieStore.delete(name)
          },
          isServer: true,
        },
      },
    }
  )

  return supabase
}
