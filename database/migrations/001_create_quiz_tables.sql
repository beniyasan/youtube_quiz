-- クイズセッションテーブル
CREATE TABLE quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  room_code VARCHAR(6) UNIQUE NOT NULL,
  host_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  current_question_index INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- クイズ参加者テーブル
CREATE TABLE quiz_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(50) NOT NULL,
  score INTEGER DEFAULT 0,
  is_eliminated BOOLEAN DEFAULT FALSE,
  is_connected BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- クイズ問題テーブル
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  video_id VARCHAR(20) NOT NULL,
  video_title TEXT NOT NULL,
  correct_answers JSONB NOT NULL, -- ["2025年宝塚記念", "メイショウタバル"]
  audio_start_time INTEGER DEFAULT 0, -- seconds
  video_start_time INTEGER DEFAULT 0, -- seconds
  question_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- クイズ回答テーブル
CREATE TABLE quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES quiz_participants(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stage_when_answered INTEGER NOT NULL CHECK (stage_when_answered IN (1, 2, 3)), -- 1=audio, 2=video, 3=full
  points_awarded INTEGER DEFAULT 0
);

-- インデックス作成
CREATE INDEX idx_quiz_sessions_room_code ON quiz_sessions(room_code);
CREATE INDEX idx_quiz_sessions_host ON quiz_sessions(host_user_id);
CREATE INDEX idx_quiz_participants_session ON quiz_participants(session_id);
CREATE INDEX idx_quiz_questions_session ON quiz_questions(session_id);
CREATE INDEX idx_quiz_questions_order ON quiz_questions(session_id, question_order);
CREATE INDEX idx_quiz_answers_session ON quiz_answers(session_id);
CREATE INDEX idx_quiz_answers_question ON quiz_answers(question_id);

-- RLS (Row Level Security) 設定
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

-- セッション作成者とセッション参加者のみアクセス可能
CREATE POLICY "Users can view quiz sessions they participate in" ON quiz_sessions
  FOR SELECT USING (
    host_user_id = auth.uid() OR 
    id IN (SELECT session_id FROM quiz_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create quiz sessions" ON quiz_sessions
  FOR INSERT WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "Session hosts can update their sessions" ON quiz_sessions
  FOR UPDATE USING (host_user_id = auth.uid());

-- 参加者ポリシー
CREATE POLICY "Users can view participants in their sessions" ON quiz_participants
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM quiz_sessions 
      WHERE host_user_id = auth.uid() OR 
            id IN (SELECT session_id FROM quiz_participants WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can join sessions" ON quiz_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 問題ポリシー
CREATE POLICY "Users can view questions in their sessions" ON quiz_questions
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM quiz_sessions 
      WHERE host_user_id = auth.uid() OR 
            id IN (SELECT session_id FROM quiz_participants WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Session hosts can create questions" ON quiz_questions
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM quiz_sessions WHERE host_user_id = auth.uid())
  );

-- 回答ポリシー
CREATE POLICY "Users can view answers in their sessions" ON quiz_answers
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM quiz_sessions 
      WHERE host_user_id = auth.uid() OR 
            id IN (SELECT session_id FROM quiz_participants WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Participants can submit answers" ON quiz_answers
  FOR INSERT WITH CHECK (
    participant_id IN (SELECT id FROM quiz_participants WHERE user_id = auth.uid())
  );