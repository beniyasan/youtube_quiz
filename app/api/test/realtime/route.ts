// リアルタイム設定テスト用のエンドポイント

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // リアルタイム機能の設定状況を確認
    console.log('Testing realtime setup...');
    
    // 1. 認証確認
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        step: 'auth_check'
      });
    }
    
    // 2. quiz_participantsテーブルへの直接アクセステスト
    const { data: participants, error: participantsError } = await supabase
      .from('quiz_participants')
      .select('*')
      .limit(5);
    
    // 3. quiz_sessionsテーブルへのアクセステスト
    const { data: sessions, error: sessionsError } = await supabase
      .from('quiz_sessions')
      .select('*')
      .limit(5);
    
    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
      participants: {
        data: participants,
        error: participantsError
      },
      sessions: {
        data: sessions,
        error: sessionsError
      },
      message: 'Database access working'
    });
  } catch (err) {
    console.error('Test realtime error:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      step: 'test_catch'
    });
  }
}