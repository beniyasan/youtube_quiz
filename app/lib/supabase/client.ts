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
        if (typeof document === 'undefined') return undefined;
        
        // デバッグ用ログ
        console.log(`Cookie get request for: ${name}`);
        console.log(`All cookies: ${document.cookie}`);
        
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [cookieName, ...rest] = cookie.split('=');
          const cookieValue = rest.join('=');
          if (cookieName.trim() === name) {
            console.log(`Found cookie ${name}:`, cookieValue);
            return cookieValue;
          }
        }
        console.log(`Cookie ${name} not found`);
        return undefined;
      },
      set(name: string, value: string, options: any = {}) {
        if (typeof document === 'undefined') return;
        
        console.log(`Setting cookie: ${name}`);
        
        let cookieString = `${name}=${value}`;
        if (options.maxAge) cookieString += `; Max-Age=${options.maxAge}`;
        if (options.path !== undefined) cookieString += `; Path=${options.path}`;
        if (options.domain) cookieString += `; Domain=${options.domain}`;
        if (options.secure) cookieString += `; Secure`;
        if (options.sameSite) cookieString += `; SameSite=${options.sameSite}`;
        if (options.httpOnly) cookieString += `; HttpOnly`;
        
        document.cookie = cookieString;
        console.log(`Cookie set: ${cookieString}`);
      },
      remove(name: string, options: any = {}) {
        if (typeof document === 'undefined') return;
        
        console.log(`Removing cookie: ${name}`);
        
        let cookieString = `${name}=; Max-Age=0`;
        if (options.path !== undefined) cookieString += `; Path=${options.path}`;
        if (options.domain) cookieString += `; Domain=${options.domain}`;
        
        document.cookie = cookieString;
        console.log(`Cookie removed: ${cookieString}`);
      },
    },
  })
}