// 特定のクイズセッション操作API

import { NextRequest, NextResponse } from 'next/server';
import { QuizSessionService } from '@/app/lib/supabase/quiz-sessions';
import { ParticipantServerService } from '@/app/lib/supabase/participants-server';
import { createClient } from '@/app/lib/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await context.params;
    
    const sessionService = new QuizSessionService();
    const participantService = new ParticipantServerService();
    
    // セッション情報取得
    const session = await sessionService.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      );
    }

    // 参加者一覧取得
    const participants = await participantService.getParticipants(sessionId);

    // 問題一覧取得
    const supabase = await createClient();
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('room_id', sessionId)
      .order('question_order');

    if (questionsError) {
      console.error('Questions fetch error:', questionsError);
    }

    // 現在の問題取得
    const currentQuestion = questions && questions.length > session.current_question_index
      ? questions[session.current_question_index]
      : null;

    // セッション統計取得
    const { data: statsData, error: statsError } = await supabase
      .rpc('get_session_stats', { p_session_id: sessionId });

    if (statsError) {
      console.error('Stats fetch error:', statsError);
    }

    return NextResponse.json({
      session,
      participants,
      questions: questions || [],
      currentQuestion,
      stats: statsData || {
        total_participants: participants.length,
        total_questions: questions?.length || 0,
        current_question: session.current_question_index,
        leaderboard: participants.map((p, index) => ({
          participant_id: p.id,
          display_name: p.display_name,
          score: p.score,
          rank: index + 1
        }))
      }
    });
  } catch (error) {
    console.error('Get session details error:', error);
    
    return NextResponse.json(
      { error: 'セッション詳細取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await context.params;
    const body = await request.json();
    const { status, current_question_index } = body;

    const sessionService = new QuizSessionService();

    // ステータス更新
    if (status) {
      await sessionService.updateSessionStatus(sessionId, status);
    }

    // 問題インデックス更新
    if (typeof current_question_index === 'number') {
      await sessionService.updateCurrentQuestionIndex(sessionId, current_question_index);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update session error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'セッション更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await context.params;

    const sessionService = new QuizSessionService();
    await sessionService.deleteSession(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete session error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'セッション削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
}