// クイズ関連の型定義

export interface QuizSession {
  id: string;
  playlist_id: string;
  room_code: string;
  host_user_id: string;
  status: 'waiting' | 'playing' | 'finished';
  current_question_index: number;
  settings: QuizSettings;
  created_at: string;
  updated_at: string;
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
  session_id: string;
  user_id: string;
  display_name: string;
  score: number;
  is_eliminated: boolean;
  joined_at: string;
}

export interface QuizQuestion {
  id: string;
  session_id: string;
  video_id: string;
  video_title: string;
  correct_answers: string[];
  audio_start_time: number; // seconds
  video_start_time: number; // seconds
  question_order: number;
  created_at: string;
}

export interface QuizAnswer {
  id: string;
  session_id: string;
  question_id: string;
  participant_id: string;
  answer_text: string;
  is_correct: boolean;
  answered_at: string;
  stage_when_answered: 1 | 2 | 3;
  points_awarded: number;
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