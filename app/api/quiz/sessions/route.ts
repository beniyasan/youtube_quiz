// クイズセッション作成API

import { NextRequest, NextResponse } from 'next/server';
import { QuizSessionService } from '@/app/lib/supabase/quiz-sessions';
import { VideoProcessor } from '@/app/lib/utils/video-processor';
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

    // セッション作成
    const sessionService = new QuizSessionService();
    const result = await sessionService.createSession(playlistId, quizSettings);

    return NextResponse.json(result);
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
    const sessionService = new QuizSessionService();
    const sessions = await sessionService.getHostedSessions();

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    
    return NextResponse.json(
      { error: 'セッション一覧取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}