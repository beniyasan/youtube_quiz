import { createClient } from '@/app/lib/supabase/api'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return NextResponse.json({ 
      authenticated: false, 
      message: 'Not authenticated',
      error: error?.message 
    }, { status: 401 })
  }
  
  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      username: user.user_metadata?.username
    }
  })
}