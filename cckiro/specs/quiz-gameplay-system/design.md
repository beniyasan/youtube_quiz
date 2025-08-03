# クイズゲームプレイシステム 設計仕様書

## 1. システム全体アーキテクチャ

### 1.1 アーキテクチャ概要
```
[Frontend (Next.js/React)]
       ↕ WebSocket
[Backend API (Next.js API Routes)]
       ↕ Database
[Supabase (PostgreSQL + Realtime)]
       ↕ External API
[YouTube Data API v3]
```

### 1.2 主要コンポーネント
- **Quiz Room Manager**: クイズルームの管理
- **Game Engine**: ゲーム進行ロジック
- **Video Player Controller**: YouTube動画再生制御
- **Buzzer System**: 早押し機能
- **Score Manager**: スコア管理
- **Answer Validator**: 正答判定

## 2. データベース設計

### 2.1 テーブル構成

#### quiz_sessions テーブル
```sql
CREATE TABLE quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES playlists(id),
  room_code VARCHAR(6) UNIQUE NOT NULL,
  host_user_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'waiting', -- waiting, playing, finished
  current_question_index INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### quiz_participants テーブル
```sql
CREATE TABLE quiz_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  display_name VARCHAR(50) NOT NULL,
  score INTEGER DEFAULT 0,
  is_eliminated BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### quiz_questions テーブル
```sql
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  video_id VARCHAR(20) NOT NULL,
  video_title TEXT NOT NULL,
  correct_answers JSONB NOT NULL, -- ["2025年宝塚記念", "メイショウタバル"]
  audio_start_time INTEGER, -- seconds
  video_start_time INTEGER, -- seconds
  question_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### quiz_answers テーブル
```sql
CREATE TABLE quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES quiz_participants(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stage_when_answered INTEGER NOT NULL, -- 1=audio, 2=video, 3=full
  points_awarded INTEGER DEFAULT 0
);
```

### 2.2 リアルタイム通信設計

#### Supabase Realtime チャンネル
```typescript
// クイズセッション用チャンネル
const channelName = `quiz_session_${sessionId}`;

// 送信するイベント種類
type QuizEvent = 
  | { type: 'buzzer_pressed', participantId: string, timestamp: number }
  | { type: 'stage_changed', stage: 1 | 2 | 3 }
  | { type: 'video_paused' }
  | { type: 'video_resumed' }
  | { type: 'answer_submitted', participantId: string, answer: string }
  | { type: 'question_completed', correctAnswer: string, scores: Record<string, number> }
  | { type: 'game_finished', finalScores: Record<string, number> };
```

## 3. フロントエンド設計

### 3.1 ページ構成
```
/quiz/room/[id]           # クイズプレイ画面
/quiz/room/[id]/host      # ホスト管理画面
/quiz/room/[id]/join      # 参加者エントリー画面
```

### 3.2 主要コンポーネント設計

#### QuizRoom コンポーネント
```typescript
interface QuizRoomProps {
  sessionId: string;
  isHost: boolean;
}

interface QuizRoomState {
  session: QuizSession;
  participants: Participant[];
  currentQuestion: Question | null;
  gameState: {
    stage: 1 | 2 | 3;
    isPlaying: boolean;
    isPaused: boolean;
    buzzerPressed: boolean;
    activeParticipant: string | null;
  };
}
```

#### VideoPlayer コンポーネント
```typescript
interface VideoPlayerProps {
  videoId: string;
  startTime?: number;
  audioOnly?: boolean;
  onReady: () => void;
  onStateChange: (state: PlayerState) => void;
}

interface VideoPlayerController {
  play(): void;
  pause(): void;
  seekTo(seconds: number): void;
  setVolume(volume: number): void;
  getCurrentTime(): number;
}
```

#### BuzzerButton コンポーネント
```typescript
interface BuzzerButtonProps {
  participantId: string;
  disabled: boolean;
  onBuzzerPress: (participantId: string) => void;
}
```

#### ScoreBoard コンポーネント
```typescript
interface ScoreBoardProps {
  participants: Array<{
    id: string;
    displayName: string;
    score: number;
    isEliminated: boolean;
  }>;
}
```

### 3.3 状態管理設計

#### React Context
```typescript
interface QuizContextValue {
  session: QuizSession | null;
  participants: Participant[];
  currentQuestion: Question | null;
  gameState: GameState;
  actions: {
    joinSession: (displayName: string) => Promise<void>;
    pressBuzzer: () => Promise<void>;
    submitAnswer: (answer: string) => Promise<void>;
    startNextQuestion: () => Promise<void>;
  };
}
```

## 4. バックエンド設計

### 4.1 API エンドポイント設計

#### クイズセッション管理
```typescript
// POST /api/quiz/sessions
interface CreateSessionRequest {
  playlistId: string;
  settings: {
    maxParticipants: number;
    timePerStage: number; // seconds
    answerTimeLimit: number; // seconds
  };
}

// GET /api/quiz/sessions/[id]
interface GetSessionResponse {
  session: QuizSession;
  participants: Participant[];
  questions: Question[];
}

// POST /api/quiz/sessions/[id]/join
interface JoinSessionRequest {
  displayName: string;
}

// POST /api/quiz/sessions/[id]/start
interface StartSessionRequest {
  // ホストのみ実行可能
}
```

#### ゲームプレイ API
```typescript
// POST /api/quiz/sessions/[id]/buzzer
interface BuzzerRequest {
  participantId: string;
  timestamp: number;
}

// POST /api/quiz/sessions/[id]/answer
interface AnswerRequest {
  participantId: string;
  questionId: string;
  answer: string;
  stage: number;
}

// POST /api/quiz/sessions/[id]/next-question
interface NextQuestionRequest {
  // ホストまたは自動進行
}
```

### 4.2 ゲームエンジン設計

#### GameEngine クラス
```typescript
class GameEngine {
  private session: QuizSession;
  private realtimeChannel: RealtimeChannel;
  
  async startQuestion(questionIndex: number): Promise<void>;
  async processBuzzer(participantId: string): Promise<void>;
  async processAnswer(participantId: string, answer: string, stage: number): Promise<boolean>;
  async nextStage(): Promise<void>;
  async nextQuestion(): Promise<void>;
  private calculateScore(stage: number): number;
  private validateAnswer(answer: string, correctAnswers: string[]): boolean;
}
```

#### AnswerValidator クラス
```typescript
class AnswerValidator {
  static validate(answer: string, correctAnswers: string[]): boolean {
    // 1. 正規化処理
    const normalizedAnswer = this.normalizeAnswer(answer);
    const normalizedCorrects = correctAnswers.map(this.normalizeAnswer);
    
    // 2. 完全一致チェック
    // 3. 部分一致チェック
    // 4. 曖昧マッチングチェック（ひらがな/カタカナ変換等）
    
    return false;
  }
  
  private static normalizeAnswer(text: string): string {
    // スペース除去、全角/半角統一、ひらがな/カタカナ統一
  }
}
```

### 4.3 YouTube動画処理設計

#### VideoProcessor クラス
```typescript
class VideoProcessor {
  static async extractAnswers(videoTitle: string): Promise<string[]> {
    // 1. 年号＋レース名パターン抽出
    // 2. 競走馬名抽出
    // 3. その他キーワード抽出
    
    const patterns = [
      /(\d{4}年\s*[^\s|]+(?:記念|杯|賞|ステークス))/g,
      /\|\s*([^|\s]+)\s*\|/g,
    ];
    
    // パターンマッチング処理
  }
  
  static generateRandomStartTime(duration: number): number {
    // 15秒再生可能な範囲でランダムな開始時間を生成
    const maxStart = Math.max(0, duration - 15);
    return Math.floor(Math.random() * maxStart);
  }
}
```

## 5. セキュリティ設計

### 5.1 認証・認可
- Supabase Auth使用
- セッション参加時の認証チェック
- ホスト権限の検証

### 5.2 リアルタイム通信セキュリティ
- セッション参加者のみ該当チャンネルへのアクセス許可
- 不正なイベント送信の検証
- レート制限実装

## 6. パフォーマンス設計

### 6.1 YouTube動画読み込み最適化
- 動画のプリロード
- 低画質での初期読み込み
- 段階的品質向上

### 6.2 リアルタイム通信最適化
- イベントのバッチ処理
- 不要なイベントのフィルタリング
- 接続状態の監視と再接続

## 7. エラーハンドリング設計

### 7.1 動画再生エラー
- 埋め込み制限動画の代替処理
- 動画削除・プライベート化への対応
- ネットワークエラー時の再試行

### 7.2 リアルタイム通信エラー
- 接続断時の自動復旧
- イベント送信失敗時の再送
- 同期ずれの検出と修正