# クイズゲームプレイシステム 実装計画書

## 1. 実装フェーズ概要

### 1.1 実装順序
1. **フェーズ1**: データベース・基盤設計
2. **フェーズ2**: 基本的なクイズセッション管理
3. **フェーズ3**: 動画プレイヤーと段階的再生
4. **フェーズ4**: 早押し機能とリアルタイム通信
5. **フェーズ5**: 回答検証とスコア管理
6. **フェーズ6**: UI/UX改善とエラーハンドリング

### 1.2 各フェーズの成果物
- フェーズ1: データベーススキーマ、型定義
- フェーズ2: クイズルーム作成・参加機能
- フェーズ3: YouTube動画再生システム
- フェーズ4: WebSocketによる早押し機能
- フェーズ5: 正答判定とスコア計算
- フェーズ6: 完成されたUIと堅牢なエラーハンドリング

## 2. フェーズ1: データベース・基盤設計

### 2.1 作業項目
1. Supabaseテーブル作成
2. TypeScript型定義作成
3. データベースアクセス関数作成

### 2.2 作成ファイル一覧

#### データベーススキーマ
```
/database/
  ├── migrations/
  │   ├── 001_create_quiz_tables.sql
  │   └── 002_create_realtime_triggers.sql
  └── seed/
      └── sample_data.sql
```

#### 型定義
```
/app/types/
  ├── quiz.ts          # クイズ関連の型定義
  ├── database.ts      # Supabaseテーブル型
  └── realtime.ts      # リアルタイムイベント型
```

#### データベースアクセス層
```
/app/lib/
  ├── supabase/
  │   ├── quiz-sessions.ts    # セッション操作
  │   ├── participants.ts     # 参加者操作
  │   └── questions.ts        # 問題操作
  └── utils/
      ├── video-processor.ts  # 動画処理ユーティリティ
      └── answer-validator.ts # 回答検証ユーティリティ
```

### 2.3 具体的実装内容

#### quiz.ts 型定義
```typescript
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
  timePerStage: number;
  answerTimeLimit: number;
  stageProgression: 'auto' | 'manual';
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
  audio_start_time: number;
  video_start_time: number;
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
```

## 3. フェーズ2: 基本的なクイズセッション管理

### 3.1 作業項目
1. クイズセッション作成API
2. セッション参加機能
3. 基本的なルーム画面

### 3.2 作成ファイル一覧

#### API Routes
```
/app/api/quiz/
  ├── sessions/
  │   ├── route.ts                    # セッション作成
  │   └── [id]/
  │       ├── route.ts                # セッション取得
  │       ├── join/
  │       │   └── route.ts            # セッション参加
  │       └── start/
  │           └── route.ts            # ゲーム開始
  └── questions/
      └── generate/
          └── route.ts                # 問題生成
```

#### フロントエンドページ
```
/app/quiz/
  ├── create/
  │   └── page.tsx                    # クイズ作成画面
  ├── join/
  │   └── page.tsx                    # 参加コード入力画面
  └── room/
      └── [id]/
          ├── page.tsx                # クイズルーム（参加者）
          ├── host/
          │   └── page.tsx            # ホスト管理画面
          └── components/
              ├── QuizRoom.tsx
              ├── ParticipantList.tsx
              └── WaitingRoom.tsx
```

### 3.3 実装詳細

#### セッション作成API
```typescript
// /app/api/quiz/sessions/route.ts
export async function POST(request: Request) {
  const { playlistId, settings } = await request.json();
  
  // 1. プレイリストの動画取得
  // 2. 問題データ生成
  // 3. セッション作成
  // 4. ルームコード生成
  
  return NextResponse.json({ sessionId, roomCode });
}
```

#### 問題生成処理
```typescript
// /app/lib/utils/video-processor.ts
export class VideoProcessor {
  static async generateQuestionsFromPlaylist(playlistId: string): Promise<QuizQuestion[]> {
    // 1. プレイリストから動画一覧取得
    // 2. 各動画のタイトルから正解抽出
    // 3. ランダムな開始時間設定
    // 4. 問題データ生成
  }
  
  static extractAnswersFromTitle(title: string): string[] {
    // パターンマッチングで正解キーワード抽出
  }
}
```

## 4. フェーズ3: 動画プレイヤーと段階的再生

### 4.1 作業項目
1. YouTube IFrame Player実装
2. 段階的再生制御
3. 音声のみ再生機能

### 4.2 作成ファイル一覧

#### 動画プレイヤーコンポーネント
```
/app/components/quiz/
  ├── VideoPlayer/
  │   ├── YouTubePlayer.tsx           # メインプレイヤー
  │   ├── AudioOnlyPlayer.tsx         # 音声のみ再生
  │   ├── StageIndicator.tsx          # 段階表示
  │   └── PlayerController.tsx        # 再生制御
  └── QuizStages/
      ├── AudioStage.tsx              # 音声段階
      ├── VideoStage.tsx              # 映像段階
      └── FullVideoStage.tsx          # 最初から再生段階
```

### 4.3 実装詳細

#### YouTubePlayer コンポーネント
```typescript
// /app/components/quiz/VideoPlayer/YouTubePlayer.tsx
interface YouTubePlayerProps {
  videoId: string;
  startTime: number;
  stage: 1 | 2 | 3;
  onReady: () => void;
  onStateChange: (state: PlayerState) => void;
}

export function YouTubePlayer({ videoId, startTime, stage, onReady, onStateChange }: YouTubePlayerProps) {
  const playerRef = useRef<YT.Player>();
  
  useEffect(() => {
    // YouTube IFrame Player API初期化
  }, []);
  
  useEffect(() => {
    // 段階に応じた再生制御
    switch (stage) {
      case 1: // 音声のみ
        // 画面を黒くして音声のみ再生
        break;
      case 2: // 映像付き
        // 指定時間から再生
        break;
      case 3: // 最初から
        // 最初から再生
        break;
    }
  }, [stage]);
}
```

#### 段階制御ロジック
```typescript
// /app/hooks/useQuizStages.ts
export function useQuizStages(timePerStage: number) {
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3>(1);
  const [timeRemaining, setTimeRemaining] = useState(timePerStage);
  const [isPaused, setIsPaused] = useState(false);
  
  const nextStage = useCallback(() => {
    if (currentStage < 3) {
      setCurrentStage(prev => (prev + 1) as 1 | 2 | 3);
      setTimeRemaining(timePerStage);
    }
  }, [currentStage, timePerStage]);
  
  return {
    currentStage,
    timeRemaining,
    isPaused,
    nextStage,
    pauseTimer: () => setIsPaused(true),
    resumeTimer: () => setIsPaused(false)
  };
}
```

## 5. フェーズ4: 早押し機能とリアルタイム通信

### 5.1 作業項目
1. Supabase Realtime設定
2. 早押しボタン実装
3. リアルタイムイベント処理

### 5.2 作成ファイル一覧

#### リアルタイム通信
```
/app/lib/realtime/
  ├── quiz-channel.ts                 # クイズチャンネル管理
  ├── events.ts                       # イベント定義
  └── handlers.ts                     # イベントハンドラー
```

#### 早押し機能
```
/app/components/quiz/
  ├── BuzzerButton/
  │   ├── BuzzerButton.tsx           # 早押しボタン
  │   ├── BuzzerStatus.tsx           # 早押し状態表示
  │   └── AnswerInput.tsx            # 回答入力
  └── ScoreBoard/
      ├── ScoreBoard.tsx             # スコアボード
      └── ParticipantCard.tsx        # 参加者カード
```

### 5.3 実装詳細

#### リアルタイムチャンネル
```typescript
// /app/lib/realtime/quiz-channel.ts
export class QuizChannel {
  private channel: RealtimeChannel;
  
  constructor(sessionId: string) {
    this.channel = supabase
      .channel(`quiz_session_${sessionId}`)
      .on('broadcast', { event: 'buzzer_pressed' }, this.handleBuzzerPressed)
      .on('broadcast', { event: 'video_paused' }, this.handleVideoPaused)
      .subscribe();
  }
  
  async pressBuzzer(participantId: string) {
    const timestamp = Date.now();
    await this.channel.send({
      type: 'broadcast',
      event: 'buzzer_pressed',
      payload: { participantId, timestamp }
    });
  }
}
```

#### 早押しボタン
```typescript
// /app/components/quiz/BuzzerButton/BuzzerButton.tsx
interface BuzzerButtonProps {
  participantId: string;
  disabled: boolean;
  onBuzzerPress: () => void;
}

export function BuzzerButton({ participantId, disabled, onBuzzerPress }: BuzzerButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  
  const handlePress = useCallback(() => {
    if (disabled || isPressed) return;
    
    setIsPressed(true);
    onBuzzerPress();
  }, [disabled, isPressed, onBuzzerPress]);
  
  // キーボードショートカット対応
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !disabled) {
        e.preventDefault();
        handlePress();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlePress, disabled]);
}
```

## 6. フェーズ5: 回答検証とスコア管理

### 6.1 作業項目
1. 回答検証ロジック実装
2. スコア計算システム
3. ゲーム進行管理

### 6.2 実装詳細

#### 回答検証
```typescript
// /app/lib/utils/answer-validator.ts
export class AnswerValidator {
  static validate(answer: string, correctAnswers: string[]): boolean {
    const normalized = this.normalizeAnswer(answer);
    
    return correctAnswers.some(correct => {
      const normalizedCorrect = this.normalizeAnswer(correct);
      
      // 完全一致
      if (normalized === normalizedCorrect) return true;
      
      // 部分一致（50%以上）
      if (this.calculateSimilarity(normalized, normalizedCorrect) >= 0.5) return true;
      
      return false;
    });
  }
  
  private static normalizeAnswer(text: string): string {
    return text
      .toLowerCase()
      .replace(/[ぁ-ん]/g, char => String.fromCharCode(char.charCodeAt(0) + 0x60)) // ひらがな→カタカナ
      .replace(/\s+/g, '')
      .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
  }
}
```

#### スコア管理
```typescript
// /app/lib/game/score-manager.ts
export class ScoreManager {
  static calculateScore(stage: 1 | 2 | 3, isCorrect: boolean): number {
    if (!isCorrect) return -1; // ペナルティ
    
    switch (stage) {
      case 1: return 3; // 音声のみで正解
      case 2: return 2; // 映像で正解
      case 3: return 1; // 最初から再生で正解
    }
  }
  
  static async updateParticipantScore(
    participantId: string, 
    points: number
  ): Promise<void> {
    await supabase
      .from('quiz_participants')
      .update({ 
        score: sql`score + ${points}` 
      })
      .eq('id', participantId);
  }
}
```

## 7. フェーズ6: UI/UX改善とエラーハンドリング

### 7.1 作業項目
1. レスポンシブデザイン対応
2. アニメーションとフィードバック
3. エラーハンドリング強化
4. パフォーマンス最適化

### 7.2 改善項目

#### UI/UXの改善
- ローディング状態の表示
- 成功/失敗のフィードバック
- スムーズなアニメーション
- モバイル対応

#### エラーハンドリング
- 動画読み込みエラー
- ネットワーク切断時の処理
- 不正な操作の防止
- 自動復旧機能

## 8. テスト計画

### 8.1 単体テスト
- 回答検証ロジック
- スコア計算
- データベース操作

### 8.2 統合テスト
- API エンドポイント
- リアルタイム通信
- ゲームフロー全体

### 8.3 E2Eテスト
- クイズセッション作成から終了まで
- 複数参加者での動作確認
- エラーケースの検証

## 9. デプロイメント計画

### 9.1 環境設定
- Vercel本番環境設定
- Supabase本番データベース
- YouTube Data API本番キー

### 9.2 監視・メトリクス
- エラー監視（Sentry等）
- パフォーマンス監視
- ユーザー行動分析

この実装計画に従って、段階的にクイズゲームプレイシステムを構築していきます。