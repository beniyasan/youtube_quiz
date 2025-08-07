// クイズ関連の型定義

export interface QuizSession {
  id: string;
  host_user_id: string; // 実際のテーブルのカラム名
  playlist_id: string;
  room_code: string;
  status: 'waiting' | 'playing' | 'finished';
  max_players: number; // 既存テーブルのカラム名
  current_question_index: number;
  settings: QuizSettings;
  created_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface QuizSettings {
  maxParticipants: number;
  timePerStage: number; // seconds
  answerTimeLimit: number; // seconds
  stageProgression: 'auto' | 'manual';
  pointsForStage1: number; // 音声のみ正解
  pointsForStage2: number; // 映像正解
  pointsForStage3: number; // 最初から正解
  penaltyPoints: number; // 不正解ペナルティ
}

export interface QuizParticipant {
  id: string;
  room_id: string; // 既存テーブルのカラム名
  user_id: string;
  display_name: string;
  score: number;
  joined_at: string;
  is_buzzer_pressed?: boolean;
  buzzer_pressed_at?: string;
}

export interface QuizQuestion {
  id: string;
  room_id: string; // 既存テーブルのカラム名
  video_id: string;
  video_title: string;
  question_text: string; // 既存テーブルのカラム名
  correct_answer: string; // 既存テーブルのカラム名（単数形）
  correct_answers: string[]; // 追加カラム
  options: any; // 既存テーブルのカラム名
  time_limit: number; // 既存テーブルのカラム名
  question_order: number;
  created_at: string;
}

export interface QuizAnswer {
  id: string;
  question_id: string;
  participant_id: string;
  answer: string; // 既存テーブルのカラム名
  is_correct: boolean;
  answered_at: string;
  stage?: 1 | 2 | 3; // 追加カラム
  points_awarded?: number; // 追加カラム
}

// ゲーム状態管理
export interface GameState {
  currentStage: 1 | 2 | 3;
  isPlaying: boolean;
  isPaused: boolean;
  timeRemaining: number;
  buzzerPressed: boolean;
  activeParticipant: string | null;
  awaitingAnswer: boolean;
}

// セッション統計
export interface SessionStats {
  total_participants: number;
  total_questions: number;
  current_question: number;
  leaderboard: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  participant_id: string;
  display_name: string;
  score: number;
  rank: number;
}

// API レスポンス型
export interface CreateSessionResponse {
  sessionId: string;
  roomCode: string;
}

export interface JoinSessionResponse {
  participant: QuizParticipant;
  session: QuizSession;
}

export interface SessionDetailsResponse {
  session: QuizSession;
  participants: QuizParticipant[];
  questions: QuizQuestion[];
  currentQuestion: QuizQuestion | null;
  stats: SessionStats;
}