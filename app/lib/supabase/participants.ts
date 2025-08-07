// クイズ参加者関連のデータベース操作

import { createClient } from '@/app/lib/supabase/client';
import type { QuizParticipant, JoinSessionResponse } from '@/app/types/quiz';

type SupabaseClient = ReturnType<typeof createClient>;

export class ParticipantService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * セッションに参加
   */
  async joinSession(
    sessionId: string,
    displayName: string
  ): Promise<JoinSessionResponse> {
    // 現在のセッションとユーザー取得
    const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
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
    const { data: existingParticipant } = await this.supabase
      .from('quiz_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (existingParticipant) {
      throw new Error('既にこのセッションに参加しています');
    }

    // クイズルーム情報を取得して参加人数制限をチェック
    const { data: quizRoom, error: roomError } = await this.supabase
      .from('quiz_rooms')
      .select('*, quiz_participants(count)')
      .eq('id', sessionId)
      .single();

    if (roomError) {
      throw new Error('セッションが見つかりません');
    }

    if (quizRoom.status !== 'waiting') {
      throw new Error('このセッションは既に開始されています');
    }

    const currentParticipants = Array.isArray(quizRoom.quiz_participants) 
      ? quizRoom.quiz_participants.length 
      : quizRoom.quiz_participants?.count || 0;

    if (currentParticipants >= quizRoom.max_players) {
      throw new Error('参加人数が上限に達しています');
    }

    // 参加者を追加
    const { data: participant, error } = await this.supabase
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
      session: quizRoom as any // TODO: 型を修正
    };
  }

  /**
   * セッションから退出
   */
  async leaveSession(sessionId: string): Promise<void> {
    const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
    if (sessionError || !session || !session.user) {
      throw new Error('ログインセッションが必要です');
    }
    const user = session.user;

    const { error } = await this.supabase
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
    const { data, error } = await this.supabase
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
   * 参加者のスコアを更新
   */
  async updateScore(participantId: string, points: number): Promise<void> {
    const { error } = await this.supabase
      .rpc('update_participant_score', {
        p_participant_id: participantId,
        p_points: points
      });

    if (error) {
      throw new Error('スコア更新に失敗しました: ' + error.message);
    }
  }

  /**
   * 参加者を失格にする
   */
  async eliminateParticipant(participantId: string): Promise<void> {
    // 既存テーブルにis_eliminatedカラムがないため、機能を無効化
    throw new Error('失格機能は未実装です');
  }

  /**
   * 特定の参加者情報を取得
   */
  async getParticipant(participantId: string): Promise<QuizParticipant | null> {
    const { data, error } = await this.supabase
      .from('quiz_participants')
      .select('*')
      .eq('id', participantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error('参加者情報取得に失敗しました: ' + error.message);
    }

    return data as QuizParticipant;
  }

  /**
   * 現在のユーザーの参加状況を取得
   */
  async getCurrentUserParticipation(sessionId: string): Promise<QuizParticipant | null> {
    const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
    if (sessionError || !session || !session.user) {
      return null;
    }
    const user = session.user;

    const { data, error } = await this.supabase
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