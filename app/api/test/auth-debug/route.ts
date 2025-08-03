// 認証状態デバッグ用API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    console.log('=== Auth Debug Start ===');

    // セッション取得をテスト
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('Session data:', sessionData);
    console.log('Session error:', sessionError);

    // ユーザー取得をテスト
    const { data: userData, error: userError } = await supabase.auth.getUser();
    console.log('User data:', userData);
    console.log('User error:', userError);

    // 環境変数チェック
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('Environment check:', { hasUrl, hasKey });

    return NextResponse.json({
      success: true,
      debug: {
        session: {
          hasSession: !!sessionData.session,
          hasUser: !!sessionData.session?.user,
          userId: sessionData.session?.user?.id || null,
          error: sessionError?.message || null
        },
        user: {
          hasUser: !!userData.user,
          userId: userData.user?.id || null,
          error: userError?.message || null
        },
        environment: {
          hasSupabaseUrl: hasUrl,
          hasSupabaseKey: hasKey,
          url: hasUrl ? process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...' : null
        },
        cookies: request.headers.get('cookie')?.includes('supabase') || false
      }
    });

  } catch (error) {
    console.error('Auth debug error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}