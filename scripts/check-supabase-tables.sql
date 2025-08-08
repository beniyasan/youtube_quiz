-- Supabaseの現在のテーブル構造を確認するSQL
-- これをSupabaseのSQL Editorで実行して、実際のテーブル名を確認してください

-- 1. 現在存在するテーブルの一覧
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'quiz_%'
ORDER BY table_name;

-- 2. 各テーブルのカラム構造
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('quiz_sessions', 'quiz_rooms', 'quiz_participants', 'quiz_questions', 'quiz_answers')
ORDER BY table_name, ordinal_position;

-- 3. 外部キー制約の確認
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name LIKE 'quiz_%';

-- 4. RLSポリシーの確認
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename LIKE 'quiz_%'
ORDER BY tablename, policyname;