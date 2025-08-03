// セッション参加API

import { NextRequest, NextResponse } from 'next/server';
import { ParticipantService } from '@/app/lib/supabase/participants';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await context.params;
    const body = await request.json();
    const { displayName } = body;

    // バリデーション
    if (!displayName || displayName.trim().length === 0) {
      return NextResponse.json(
        { error: '表示名が必要です' },
        { status: 400 }
      );
    }

    if (displayName.length > 50) {
      return NextResponse.json(
        { error: '表示名は50文字以内で入力してください' },
        { status: 400 }
      );
    }

    const participantService = new ParticipantService();
    const result = await participantService.joinSession(sessionId, displayName.trim());

    return NextResponse.json(result);
  } catch (error) {
    console.error('Join session error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'セッション参加中にエラーが発生しました' },
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

    const participantService = new ParticipantService();
    await participantService.leaveSession(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leave session error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'セッション退出中にエラーが発生しました' },
      { status: 500 }
    );
  }
}