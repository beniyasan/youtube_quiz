// サーバーサイド用クイズ参加者関連のデータベース操作

import { createClient } from '@/app/lib/supabase/server';
import type { QuizParticipant, JoinSessionResponse } from '@/app/types/quiz';

export class ParticipantServerService {
  /**
   * セッションに参加
   */
  async joinSession(
    sessionId: string,
    displayName: string
  ): Promise<JoinSessionResponse> {
    const supabase = await createClient();
    
    // 現在のセッションとユーザー取得
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error(`認証エラー: ${sessionError.message}`);
    }
    if (!session || !session.user) {
      console.error('No session or user found');
      throw new Error('ログインセッションが見つかりません。再度ログインしてください。');
    }
    const user = session.user;

    // 既に参加しているかチェック
    const { data: existingParticipant } = await supabase
      .from('quiz_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (existingParticipant) {
      throw new Error('既にこのセッションに参加しています');
    }

    // クイズセッション情報を取得して参加人数制限をチェック
    const { data: quizSession, error: sessionError2 } = await supabase
      .from('quiz_sessions')
      .select('id, status, settings')
      .eq('id', sessionId)
      .single();

    if (sessionError2) {
      throw new Error('セッションが見つかりません');
    }

    if (quizSession.status !== 'waiting') {
      throw new Error('このセッションは既に開始されています');
    }

    // 現在の参加者数を取得
    const { count: currentParticipants, error: countError } = await supabase
      .from('quiz_participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (countError) {
      console.error('Participant count error:', countError);
    }

    const maxParticipants = quizSession.settings?.maxParticipants || 10;
    if ((currentParticipants || 0) >= maxParticipants) {
      throw new Error('参加人数が上限に達しています');
    }

    // 参加者を追加
    const { data: participant, error } = await supabase
      .from('quiz_participants')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        display_name: displayName
      })
      .select()
      .single();

    if (error) {
      throw new Error('参加に失敗しました: ' + error.message);
    }

    return {
      participant: participant as QuizParticipant,
      session: quizSession as any // TODO: 型を修正
    };
  }

  /**
   * セッションから退出
   */
  async leaveSession(sessionId: string): Promise<void> {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session || !session.user) {
      throw new Error('ログインセッションが必要です');
    }
    const user = session.user;

    const { error } = await supabase
      .from('quiz_participants')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error('退出に失敗しました: ' + error.message);
    }
  }

  /**
   * セッションの参加者一覧を取得
   */
  async getParticipants(sessionId: string): Promise<QuizParticipant[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('quiz_participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true });

    if (error) {
      throw new Error('参加者一覧取得に失敗しました: ' + error.message);
    }

    return data as QuizParticipant[];
  }

  /**
   * 現在のユーザーの参加状況を取得
   */
  async getCurrentUserParticipation(sessionId: string): Promise<QuizParticipant | null> {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session || !session.user) {
      return null;
    }
    const user = session.user;

    const { data, error } = await supabase
      .from('quiz_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error('参加状況取得に失敗しました: ' + error.message);
    }

    return data as QuizParticipant;
  }
}