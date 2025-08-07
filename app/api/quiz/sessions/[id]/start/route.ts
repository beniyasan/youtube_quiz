// ゲーム開始API

import { NextRequest, NextResponse } from 'next/server';
import { QuizSessionService } from '@/app/lib/supabase/quiz-sessions';
import { createClient } from '@/app/lib/supabase/client';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await context.params;

    const sessionService = new QuizSessionService();
    const session = await sessionService.getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      );
    }

    // 現在のユーザーがホストかチェック
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    if (session.host_id !== user.id) {
      return NextResponse.json(
        { error: 'ホストのみがゲームを開始できます' },
        { status: 403 }
      );
    }

    if (session.status !== 'waiting') {
      return NextResponse.json(
        { error: 'このセッションは既に開始されているか終了しています' },
        { status: 400 }
      );
    }

    // 問題があるかチェック
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id')
      .eq('session_id', sessionId);

    if (questionsError) {
      throw new Error('問題取得に失敗しました');
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: '問題が生成されていません。先に問題を生成してください。' },
        { status: 400 }
      );
    }

    // 参加者がいるかチェック
    const { data: participants, error: participantsError } = await supabase
      .from('quiz_participants')
      .select('id')
      .eq('session_id', sessionId);

    if (participantsError) {
      throw new Error('参加者取得に失敗しました');
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json(
        { error: '参加者がいません' },
        { status: 400 }
      );
    }

    // ゲーム開始
    await sessionService.updateSessionStatus(sessionId, 'playing');
    await sessionService.updateCurrentQuestionIndex(sessionId, 0);

    return NextResponse.json({ 
      success: true,
      message: 'ゲームを開始しました',
      totalQuestions: questions.length,
      totalParticipants: participants.length
    });
  } catch (error) {
    console.error('Start game error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'ゲーム開始中にエラーが発生しました' },
      { status: 500 }
    );
  }
}