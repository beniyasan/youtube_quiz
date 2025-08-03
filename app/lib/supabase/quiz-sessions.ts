// クイズセッション関連のデータベース操作

import { createClient } from '@/app/lib/supabase/client';
import type { Database } from '@/app/types/database';
import type { QuizSession, QuizSettings, CreateSessionResponse } from '@/app/types/quiz';

type SupabaseClient = ReturnType<typeof createClient>;

export class QuizSessionService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * 新しいクイズセッションを作成
   */
  async createSession(
    playlistId: string,
    settings: QuizSettings,
    skipAuth: boolean = false
  ): Promise<CreateSessionResponse> {
    // ルームコード生成
    const { data: roomCodeData, error: roomCodeError } = await this.supabase
      .rpc('generate_room_code');

    if (roomCodeError) {
      throw new Error('ルームコード生成に失敗しました');
    }

    // 認証チェック（スキップオプション付き）
    let userId: string;
    
    if (skipAuth) {
      // 認証スキップ時はダミーユーザーIDを使用
      userId = '00000000-0000-0000-0000-000000000000';
      console.log('Auth skipped, using dummy user ID');
    } else {
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
      userId = session.user.id;
    }

    // セッション作成（既存quiz_roomsテーブルを使用）
    const { data, error } = await this.supabase
      .from('quiz_rooms')
      .insert({
        playlist_id: playlistId,
        room_code: roomCodeData,
        host_id: userId,
        max_players: settings.maxParticipants,
        settings: settings as any
      })
      .select()
      .single();

    if (error) {
      throw new Error('セッション作成に失敗しました: ' + error.message);
    }

    return {
      sessionId: data.id,
      roomCode: data.room_code
    };
  }

  /**
   * セッション情報を取得
   */
  async getSession(sessionId: string): Promise<QuizSession | null> {
    const { data, error } = await this.supabase
      .from('quiz_rooms')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // セッションが見つからない
      }
      throw new Error('セッション取得に失敗しました: ' + error.message);
    }

    return data as QuizSession;
  }

  /**
   * ルームコードでセッションを検索
   */
  async getSessionByRoomCode(roomCode: string): Promise<QuizSession | null> {
    const { data, error } = await this.supabase
      .from('quiz_rooms')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error('セッション取得に失敗しました: ' + error.message);
    }

    return data as QuizSession;
  }

  /**
   * セッションステータスを更新
   */
  async updateSessionStatus(
    sessionId: string,
    status: 'waiting' | 'playing' | 'finished'
  ): Promise<void> {
    const { error } = await this.supabase
      .from('quiz_rooms')
      .update({ status })
      .eq('id', sessionId);

    if (error) {
      throw new Error('ステータス更新に失敗しました: ' + error.message);
    }
  }

  /**
   * 現在の問題インデックスを更新
   */
  async updateCurrentQuestionIndex(
    sessionId: string,
    questionIndex: number
  ): Promise<void> {
    const { error } = await this.supabase
      .from('quiz_rooms')
      .update({ current_question_index: questionIndex })
      .eq('id', sessionId);

    if (error) {
      throw new Error('問題インデックス更新に失敗しました: ' + error.message);
    }
  }

  /**
   * セッションを削除
   */
  async deleteSession(sessionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('quiz_rooms')
      .delete()
      .eq('id', sessionId);

    if (error) {
      throw new Error('セッション削除に失敗しました: ' + error.message);
    }
  }

  /**
   * ユーザーがホストしているセッション一覧を取得
   */
  async getHostedSessions(): Promise<QuizSession[]> {
    const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
    if (sessionError || !session || !session.user) {
      throw new Error('ログインセッションが必要です');
    }
    const user = session.user;

    const { data, error } = await this.supabase
      .from('quiz_rooms')
      .select('*')
      .eq('host_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('セッション一覧取得に失敗しました: ' + error.message);
    }

    return data as QuizSession[];
  }
}