import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn('Supabase environment variables are not set. Using placeholder values for build.')
    return createBrowserClient(
      url || 'https://placeholder.supabase.co',
      key || 'placeholder-key'
    )
  }

  return createBrowserClient(url, key, {
    cookies: {
      get(name: string) {
        if (typeof document !== 'undefined') {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(';').shift();
        }
        return undefined;
      },
      set(name: string, value: string, options: any) {
        if (typeof document !== 'undefined') {
          let cookieString = `${name}=${value}`;
          if (options?.maxAge) cookieString += `; Max-Age=${options.maxAge}`;
          if (options?.path) cookieString += `; Path=${options.path}`;
          if (options?.domain) cookieString += `; Domain=${options.domain}`;
          if (options?.secure) cookieString += `; Secure`;
          if (options?.sameSite) cookieString += `; SameSite=${options.sameSite}`;
          document.cookie = cookieString;
        }
      },
      remove(name: string, options: any) {
        if (typeof document !== 'undefined') {
          let cookieString = `${name}=; Max-Age=0`;
          if (options?.path) cookieString += `; Path=${options.path}`;
          if (options?.domain) cookieString += `; Domain=${options.domain}`;
          document.cookie = cookieString;
        }
      },
    },
  })
}