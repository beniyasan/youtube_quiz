// リアルタイムイベント型定義

export type QuizRealtimeEvent = 
  | BuzzerPressedEvent
  | VideoPausedEvent
  | VideoResumedEvent
  | StageChangedEvent
  | AnswerSubmittedEvent
  | QuestionCompletedEvent
  | GameFinishedEvent
  | ParticipantJoinedEvent
  | ParticipantLeftEvent
  | ScoreUpdatedEvent;

// 早押しボタンが押された
export interface BuzzerPressedEvent {
  type: 'buzzer_pressed';
  participantId: string;
  participantName: string;
  timestamp: number;
}

// 動画が一時停止された
export interface VideoPausedEvent {
  type: 'video_paused';
  pausedBy: string;
  currentTime: number;
}

// 動画が再開された
export interface VideoResumedEvent {
  type: 'video_resumed';
  resumedBy: string;
  currentTime: number;
}

// ステージが変更された
export interface StageChangedEvent {
  type: 'stage_changed';
  newStage: 1 | 2 | 3;
  questionId: string;
  timeRemaining: number;
}

// 回答が提出された
export interface AnswerSubmittedEvent {
  type: 'answer_submitted';
  participantId: string;
  participantName: string;
  answer: string;
  isCorrect: boolean;
  pointsAwarded: number;
  stage: 1 | 2 | 3;
}

// 問題が完了した
export interface QuestionCompletedEvent {
  type: 'question_completed';
  questionId: string;
  correctAnswer: string;
  scores: Record<string, number>;
  nextQuestionIn: number; // seconds
}

// ゲームが終了した
export interface GameFinishedEvent {
  type: 'game_finished';
  finalScores: LeaderboardEntry[];
  winner: {
    participantId: string;
    displayName: string;
    score: number;
  };
}

// 参加者が参加した
export interface ParticipantJoinedEvent {
  type: 'participant_joined';
  participant: {
    id: string;
    displayName: string;
  };
  totalParticipants: number;
}

// 参加者が退出した
export interface ParticipantLeftEvent {
  type: 'participant_left';
  participantId: string;
  participantName: string;
  totalParticipants: number;
}

// スコアが更新された
export interface ScoreUpdatedEvent {
  type: 'score_updated';
  participantId: string;
  newScore: number;
  scoreChange: number;
  leaderboard: LeaderboardEntry[];
}

// リアルタイムチャンネルのペイロード
export interface RealtimePayload<T = QuizRealtimeEvent> {
  event: T['type'];
  payload: T;
  timestamp: number;
}

// WebSocket接続状態
export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastSeen: number;
  retryCount: number;
}

import { LeaderboardEntry } from './quiz';