// Supabaseデータベーステーブル型定義

export interface Database {
  public: {
    Tables: {
      quiz_sessions: {
        Row: {
          id: string;
          playlist_id: string;
          room_code: string;
          host_id: string;
          status: 'waiting' | 'playing' | 'finished';
          current_question_index: number;
          settings: QuizSettingsDb;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          playlist_id: string;
          room_code: string;
          host_id: string;
          status?: 'waiting' | 'playing' | 'finished';
          current_question_index?: number;
          settings?: QuizSettingsDb;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          playlist_id?: string;
          room_code?: string;
          host_id?: string;
          status?: 'waiting' | 'playing' | 'finished';
          current_question_index?: number;
          settings?: QuizSettingsDb;
          created_at?: string;
          updated_at?: string;
        };
      };
      quiz_participants: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          display_name: string;
          score: number;
          is_eliminated: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          display_name: string;
          score?: number;
          is_eliminated?: boolean;
          joined_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          display_name?: string;
          score?: number;
          is_eliminated?: boolean;
          joined_at?: string;
        };
      };
      quiz_questions: {
        Row: {
          id: string;
          session_id: string;
          video_id: string;
          video_title: string;
          correct_answers: string[];
          audio_start_time: number;
          video_start_time: number;
          question_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          video_id: string;
          video_title: string;
          correct_answers: string[];
          audio_start_time?: number;
          video_start_time?: number;
          question_order: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          video_id?: string;
          video_title?: string;
          correct_answers?: string[];
          audio_start_time?: number;
          video_start_time?: number;
          question_order?: number;
          created_at?: string;
        };
      };
      quiz_answers: {
        Row: {
          id: string;
          session_id: string;
          question_id: string;
          participant_id: string;
          answer_text: string;
          is_correct: boolean;
          answered_at: string;
          stage_when_answered: 1 | 2 | 3;
          points_awarded: number;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_id: string;
          participant_id: string;
          answer_text: string;
          is_correct: boolean;
          answered_at?: string;
          stage_when_answered: 1 | 2 | 3;
          points_awarded?: number;
        };
        Update: {
          id?: string;
          session_id?: string;
          question_id?: string;
          participant_id?: string;
          answer_text?: string;
          is_correct?: boolean;
          answered_at?: string;
          stage_when_answered?: 1 | 2 | 3;
          points_awarded?: number;
        };
      };
    };
    Functions: {
      generate_room_code: {
        Args: {};
        Returns: string;
      };
      update_participant_score: {
        Args: {
          p_participant_id: string;
          p_points: number;
        };
        Returns: void;
      };
      get_session_stats: {
        Args: {
          p_session_id: string;
        };
        Returns: {
          total_participants: number;
          total_questions: number;
          current_question: number;
          leaderboard: Array<{
            participant_id: string;
            display_name: string;
            score: number;
            rank: number;
          }>;
        };
      };
    };
  };
}

// JSONB設定型
export interface QuizSettingsDb {
  maxParticipants: number;
  timePerStage: number;
  answerTimeLimit: number;
  stageProgression: 'auto' | 'manual';
  pointsForStage1: number;
  pointsForStage2: number;
  pointsForStage3: number;
  penaltyPoints: number;
}