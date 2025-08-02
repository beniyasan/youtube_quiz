import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 認証が必要なパスを定義
  const protectedPaths = ['/dashboard', '/playlist', '/quiz']
  const authPaths = ['/auth/login', '/auth/register', '/auth/verify-email']
  const publicPaths = ['/']

  const path = request.nextUrl.pathname

  // 認証が必要なパスの場合、クライアントサイドで認証チェックを行う
  if (protectedPaths.some(p => path.startsWith(p))) {
    // Supabaseの認証cookieがあるかチェック
    const authCookie = request.cookies.get('sb-access-token') || 
                      request.cookies.get('supabase-auth-token') ||
                      request.cookies.getAll().find(cookie => 
                        cookie.name.includes('supabase') || cookie.name.includes('auth')
                      )
    
    if (!authCookie) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}