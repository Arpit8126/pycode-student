import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (typeof window === 'undefined') {
    return createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  if (client) return client

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return client
}

export async function safeGetUser(supabase: any) {
  if (typeof window === 'undefined') {
    return await supabase.auth.getUser();
  }

  const getCachedUser = () => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            if (parsed && parsed.user) {
              return parsed.user;
            }
          }
        }
      }
    } catch (e) {
      console.error('Error reading cached user session:', e);
    }
    return null;
  };

  const cachedUser = getCachedUser();

  if (!navigator.onLine && cachedUser) {
    return { data: { user: cachedUser }, error: null };
  }

  try {
    const res = await supabase.auth.getUser();
    if (res.data?.user) {
      return res;
    }
    if (cachedUser) {
      return { data: { user: cachedUser }, error: null };
    }
    return res;
  } catch (err: any) {
    if (cachedUser) {
      return { data: { user: cachedUser }, error: null };
    }
    return { data: { user: null }, error: err };
  }
}
