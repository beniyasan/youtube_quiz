// 認証スキップ版クイズ作成テストAPI

import { NextRequest, NextResponse } from 'next/server';
import { QuizSessionService } from '@/app/lib/supabase/quiz-sessions';
import type { QuizSettings } from '@/app/types/quiz';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Quiz Create Test (Auth Skipped) ===');

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

    // ダミープレイリストIDを使用（実際のプレイリストIDがあれば使用）
    const dummyPlaylistId = '00000000-0000-0000-0000-000000000000';

    // 認証をスキップしてセッション作成
    const sessionService = new QuizSessionService();
    const result = await sessionService.createSession(
      dummyPlaylistId, 
      defaultSettings,
      true // 認証スキップ
    );

    console.log('Quiz session created successfully:', result);

    return NextResponse.json({
      success: true,
      result,
      message: 'クイズセッション作成成功（認証スキップ版）'
    });

  } catch (error) {
    console.error('Quiz create test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}