import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(cookiesToSet: any[]) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cookiesToSet.forEach((c: any) => {
              if (c.options) {
                cookieStore.set(c.name, c.value, c.options)
              } else {
                cookieStore.set(c.name, c.value)
              }
            })
          } catch {
            // Called from a Server Component — cookies cannot be mutated.
            // The middleware handles session refresh instead.
          }
        },
      },
    }
  )
}
