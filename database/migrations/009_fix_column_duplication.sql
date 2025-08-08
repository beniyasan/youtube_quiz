-- 緊急修正: テーブルの二重カラム問題と不整合を解消
-- SupabaseスキーマにはRoomIDとSessionIDの両方が存在している問題を修正
-- 外部キー制約エラーを回避するため、ユーザー情報以外のデータを一旦クリア

-- ============================================
-- 0. データクリア（ユーザー情報以外）
-- ============================================

-- 外部キー制約の順序を考慮してクリア
DELETE FROM quiz_answers;
DELETE FROM quiz_questions; 
DELETE FROM quiz_participants;
DELETE FROM quiz_sessions;
DELETE FROM youtube_videos;
DELETE FROM playlists WHERE user_id IS NOT NULL; -- usersテーブルは保持

-- ============================================
-- 1. quiz_participantsテーブルの修正
-- ============================================

-- 現在の状況:
-- - room_id (uuid, NOT NULL) <- 古い設計
-- - session_id (uuid, NULLABLE) <- 新しい設計、外部キー制約あり

-- データがクリアされているため、直接カラム修正
-- session_idをNOT NULLに変更
ALTER TABLE quiz_participants 
ALTER COLUMN session_id SET NOT NULL;

-- room_idカラムを削除
ALTER TABLE quiz_participants 
DROP COLUMN room_id;

-- ============================================
-- 2. quiz_questionsテーブルの修正
-- ============================================

-- 現在の状況:
-- - room_id (uuid, NULLABLE) <- 古い設計
-- - session_id (uuid, NOT NULL) <- 新しい設計

-- データがクリアされているため、直接カラム削除
-- room_idカラムを削除
ALTER TABLE quiz_questions 
DROP COLUMN room_id;

-- ============================================
-- 3. 外部キー制約の確認と修正
-- ============================================

-- quiz_questionsにsession_idの外部キー制約を追加（存在しない場合）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'quiz_questions_session_id_fkey'
    ) THEN
        ALTER TABLE quiz_questions 
        ADD CONSTRAINT quiz_questions_session_id_fkey 
        FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================
-- 4. quiz_answersテーブルにsession_id追加
-- ============================================

-- quiz_answersテーブルにsession_idカラムを追加（効率化のため）
ALTER TABLE quiz_answers 
ADD COLUMN IF NOT EXISTS session_id UUID NOT NULL DEFAULT gen_random_uuid();

-- デフォルト値を削除（一時的に設定しただけ）
ALTER TABLE quiz_answers 
ALTER COLUMN session_id DROP DEFAULT;

-- 外部キー制約を追加
ALTER TABLE quiz_answers 
ADD CONSTRAINT quiz_answers_session_id_fkey 
FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE;

-- ============================================
-- 5. RLS（Row Level Security）の有効化と修正
-- ============================================

-- quiz_sessionsのRLSを有効化
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

-- quiz_participantsのRLSを有効化
ALTER TABLE quiz_participants ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（エラー回避のため）
DROP POLICY IF EXISTS "Users can view quiz sessions they participate in" ON quiz_sessions;
DROP POLICY IF EXISTS "Users can create quiz sessions" ON quiz_sessions;
DROP POLICY IF EXISTS "Session hosts can update their sessions" ON quiz_sessions;

DROP POLICY IF EXISTS "Users can view participants in their sessions" ON quiz_participants;
DROP POLICY IF EXISTS "Users can join sessions" ON quiz_participants;
DROP POLICY IF EXISTS "Users can update their participation" ON quiz_participants;

-- quiz_sessionsのRLSポリシーを作成
CREATE POLICY "Users can view quiz sessions they participate in" ON quiz_sessions
    FOR SELECT USING (
        host_user_id = auth.uid() OR 
        id IN (SELECT session_id FROM quiz_participants WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create quiz sessions" ON quiz_sessions
    FOR INSERT WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "Session hosts can update their sessions" ON quiz_sessions
    FOR UPDATE USING (host_user_id = auth.uid());

-- quiz_participantsのRLSポリシーを作成
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

CREATE POLICY "Users can update their participation" ON quiz_participants
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- 6. インデックスの最適化
-- ============================================

-- 重複するインデックスを削除してから新しいインデックスを作成
DROP INDEX IF EXISTS idx_quiz_participants_room_id;
DROP INDEX IF EXISTS idx_quiz_participants_session_id;

-- 必要なインデックスを作成
CREATE INDEX IF NOT EXISTS idx_quiz_participants_session_id ON quiz_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_participants_user_id ON quiz_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_session_id ON quiz_answers(session_id);

-- ============================================
-- 7. Realtime設定の確認
-- ============================================

-- 必要なテーブルをRealtime publicationに追加
DO $$
BEGIN
    -- quiz_sessionsを追加
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'quiz_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE quiz_sessions;
    END IF;
    
    -- quiz_participantsを追加
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'quiz_participants'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE quiz_participants;
    END IF;
    
    -- quiz_questionsを追加
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'quiz_questions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE quiz_questions;
    END IF;
    
    -- quiz_answersを追加
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'quiz_answers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE quiz_answers;
    END IF;
END $$;

-- ============================================
-- 8. 検証クエリ
-- ============================================

-- テーブル構造の確認
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('quiz_sessions', 'quiz_participants', 'quiz_questions', 'quiz_answers')
AND column_name LIKE '%id%'
ORDER BY table_name, ordinal_position;

-- RLS状態の確認
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename LIKE 'quiz_%';

-- 外部キー制約の確認
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name LIKE 'quiz_%'
ORDER BY tc.table_name;