// クイズセッション作成API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/api';
import type { QuizSettings } from '@/app/types/quiz';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playlistId, settings } = body;

    // バリデーション
    if (!playlistId) {
      return NextResponse.json(
        { error: 'プレイリストIDが必要です' },
        { status: 400 }
      );
    }

    // デフォルト設定
    const defaultSettings: QuizSettings = {
      maxParticipants: 10,
      timePerStage: 15,
      answerTimeLimit: 10,
      stageProgression: 'auto',
      pointsForStage1: 3,
      pointsForStage2: 2,
      pointsForStage3: 1,
      penaltyPoints: -1
    };

    const quizSettings: QuizSettings = {
      ...defaultSettings,
      ...settings
    };

    // サーバーサイドでの認証とセッション作成
    const supabase = await createClient();
    
    // 認証チェック
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Server auth error:', userError);
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    console.log('Authenticated user:', user.id);

    // プレイリスト存在確認
    const { data: playlistData, error: playlistError } = await supabase
      .from('playlists')
      .select('id, name')
      .eq('id', playlistId)
      .single();

    if (playlistError) {
      console.error('Playlist check error:', playlistError);
      return NextResponse.json(
        { 
          error: '指定されたプレイリストが見つかりません', 
          details: playlistError.message || playlistError.code || 'Unknown error'
        },
        { status: 404 }
      );
    }

    console.log('Playlist found:', playlistData);

    // ルームコード生成
    const { data: roomCodeData, error: roomCodeError } = await supabase.rpc('generate_room_code');
    if (roomCodeError) {
      console.error('Room code generation error:', roomCodeError);
      console.error('Full room code error:', JSON.stringify(roomCodeError, null, 2));
      return NextResponse.json(
        { 
          error: 'ルームコード生成に失敗しました', 
          details: roomCodeError.message || roomCodeError.code || 'Unknown error',
          fullError: roomCodeError
        },
        { status: 500 }
      );
    }

    console.log('Generated room code:', roomCodeData);

    // セッション作成
    const { data, error } = await supabase
      .from('quiz_sessions')
      .insert({
        playlist_id: playlistId,
        room_code: roomCodeData,
        host_user_id: user.id,
        settings: quizSettings as any
      })
      .select()
      .single();

    if (error) {
      console.error('Session creation error:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { 
          error: 'セッション作成に失敗しました', 
          details: error.message || error.code || 'Unknown error',
          fullError: error
        },
        { status: 500 }
      );
    }

    console.log('Session created:', data);

    return NextResponse.json({
      sessionId: data.id,
      roomCode: data.room_code
    });
  } catch (error) {
    console.error('Session creation error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'セッション作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 認証チェック
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    // ホストしているセッション一覧取得
    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('host_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('セッション一覧取得に失敗しました: ' + error.message);
    }

    return NextResponse.json({ sessions: data || [] });
  } catch (error) {
    console.error('Get sessions error:', error);
    
    return NextResponse.json(
      { error: 'セッション一覧取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}