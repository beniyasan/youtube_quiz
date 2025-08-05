import { createClient } from '@/app/lib/supabase/api'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Get cookies info
    const cookies = request.headers.get('cookie') || ''
    const cookieNames = cookies.split(';').map(c => c.trim().split('=')[0]).filter(Boolean)
    const hasSupabaseCookies = cookieNames.some(name => 
      name.includes('sb-') && name.includes('-auth-token')
    )
    
    const debug = {
      session: {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id || null,
        error: sessionError?.message || null
      },
      user: {
        hasUser: !!user,
        userId: user?.id || null,
        error: userError?.message || null
      },
      environment: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
          process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + '...' : 
          'Not set'
      },
      cookies: {
        hasCookies: cookies.length > 0,
        cookieString: cookies.substring(0, 200) + (cookies.length > 200 ? '...' : ''),
        hasSupabaseCookies,
        allCookieNames: cookieNames
      }
    }
    
    return NextResponse.json({ success: true, debug })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}