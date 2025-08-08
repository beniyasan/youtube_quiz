-- データベーススキーマ同期用マイグレーション
-- 既存のテーブルと新しい設計の差分を解消

-- ============================================
-- 1. 既存テーブルのリネーム（必要な場合）
-- ============================================

-- quiz_roomsテーブルが存在する場合、quiz_sessionsにリネーム
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_rooms') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_sessions') THEN
        ALTER TABLE quiz_rooms RENAME TO quiz_sessions;
        
        -- カラム名の変更
        ALTER TABLE quiz_sessions RENAME COLUMN host_id TO host_user_id;
        ALTER TABLE quiz_sessions RENAME COLUMN room_id TO id;
    END IF;
END $$;

-- ============================================
-- 2. quiz_sessionsテーブルの確認と作成
-- ============================================

CREATE TABLE IF NOT EXISTS quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
    room_code VARCHAR(6) UNIQUE NOT NULL,
    host_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
    current_question_index INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}',
    max_players INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 3. quiz_participantsテーブルの調整
-- ============================================

-- 既存のquiz_participantsテーブルのカラム調整
DO $$
BEGIN
    -- room_idカラムが存在する場合、session_idにリネーム
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'quiz_participants' AND column_name = 'room_id') THEN
        ALTER TABLE quiz_participants RENAME COLUMN room_id TO session_id;
    END IF;
    
    -- 必要なカラムを追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_participants' AND column_name = 'session_id') THEN
        ALTER TABLE quiz_participants ADD COLUMN session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_participants' AND column_name = 'display_name') THEN
        ALTER TABLE quiz_participants ADD COLUMN display_name VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_participants' AND column_name = 'is_eliminated') THEN
        ALTER TABLE quiz_participants ADD COLUMN is_eliminated BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_participants' AND column_name = 'is_connected') THEN
        ALTER TABLE quiz_participants ADD COLUMN is_connected BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- ============================================
-- 4. quiz_questionsテーブルの調整
-- ============================================

-- 新しいquiz_questionsテーブル構造の作成
CREATE TABLE IF NOT EXISTS quiz_questions_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    video_id VARCHAR(20) NOT NULL,
    video_title TEXT NOT NULL,
    correct_answers JSONB NOT NULL,
    audio_start_time INTEGER DEFAULT 0,
    video_start_time INTEGER DEFAULT 0,
    question_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 既存データの移行（もし古いテーブルが存在する場合）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_questions') 
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_questions' AND column_name = 'room_id') THEN
        -- 古いデータを新しいテーブルに移行
        INSERT INTO quiz_questions_new (
            id, session_id, video_id, video_title, correct_answers, question_order, created_at
        )
        SELECT 
            id, 
            room_id as session_id,
            COALESCE(video_id::text, ''),
            COALESCE(video_title, question_text, ''),
            CASE 
                WHEN correct_answers IS NOT NULL THEN correct_answers::jsonb
                ELSE jsonb_build_array(correct_answer)
            END,
            COALESCE(question_order, 0),
            created_at
        FROM quiz_questions
        ON CONFLICT DO NOTHING;
        
        -- 古いテーブルを削除して新しいテーブルをリネーム
        DROP TABLE quiz_questions CASCADE;
        ALTER TABLE quiz_questions_new RENAME TO quiz_questions;
    ELSEIF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_questions') THEN
        -- テーブルが存在しない場合は新しいテーブルを作成
        ALTER TABLE quiz_questions_new RENAME TO quiz_questions;
    END IF;
END $$;

-- ============================================
-- 5. quiz_answersテーブルの調整
-- ============================================

-- 新しいquiz_answersテーブル構造の作成
CREATE TABLE IF NOT EXISTS quiz_answers_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES quiz_participants(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    stage_when_answered INTEGER NOT NULL CHECK (stage_when_answered IN (1, 2, 3)),
    points_awarded INTEGER DEFAULT 0
);

-- 既存データの移行
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_answers') THEN
        -- セッションIDを取得するためのサブクエリを使用して移行
        INSERT INTO quiz_answers_new (
            id, session_id, question_id, participant_id, answer_text, is_correct, 
            answered_at, stage_when_answered, points_awarded
        )
        SELECT 
            qa.id,
            qp.session_id,
            qa.question_id,
            qa.participant_id,
            qa.answer,
            qa.is_correct,
            qa.answered_at,
            COALESCE(qa.stage, 1),
            COALESCE(qa.points_awarded, 0)
        FROM quiz_answers qa
        JOIN quiz_participants qp ON qa.participant_id = qp.id
        ON CONFLICT DO NOTHING;
        
        -- 古いテーブルを削除して新しいテーブルをリネーム
        DROP TABLE quiz_answers CASCADE;
        ALTER TABLE quiz_answers_new RENAME TO quiz_answers;
    ELSEIF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_answers') THEN
        ALTER TABLE quiz_answers_new RENAME TO quiz_answers;
    END IF;
END $$;

-- ============================================
-- 6. インデックスの作成
-- ============================================

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_room_code ON quiz_sessions(room_code);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_host ON quiz_sessions(host_user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_participants_session ON quiz_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_session ON quiz_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON quiz_questions(session_id, question_order);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_session ON quiz_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question ON quiz_answers(question_id);

-- ============================================
-- 7. RLS（Row Level Security）の再設定
-- ============================================

-- RLSを有効化
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

-- quiz_sessionsのポリシー
CREATE POLICY "Users can view quiz sessions they participate in" ON quiz_sessions
    FOR SELECT USING (
        host_user_id = auth.uid() OR 
        id IN (SELECT session_id FROM quiz_participants WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create quiz sessions" ON quiz_sessions
    FOR INSERT WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "Session hosts can update their sessions" ON quiz_sessions
    FOR UPDATE USING (host_user_id = auth.uid());

-- quiz_participantsのポリシー
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

-- quiz_questionsのポリシー
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

-- quiz_answersのポリシー
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

-- ============================================
-- 8. ルームコード生成関数（存在しない場合のみ作成）
-- ============================================

CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    
    -- 重複チェック
    WHILE EXISTS(SELECT 1 FROM quiz_sessions WHERE room_code = result) LOOP
        result := '';
        FOR i IN 1..6 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
        END LOOP;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. Realtime設定
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_answers;