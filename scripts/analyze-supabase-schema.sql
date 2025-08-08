-- =========================================
-- Supabaseスキーマ分析クエリ集
-- Supabase SQL Editorで実行してください
-- =========================================

-- 1. 【基本情報】現在存在するテーブルの一覧
SELECT 
    table_name,
    table_type,
    table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%quiz%'
ORDER BY table_name;

-- 2. 【テーブル構造】各テーブルの詳細なカラム情報
SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
    table_name LIKE '%quiz%' 
    OR table_name LIKE '%playlist%'
    OR table_name LIKE '%youtube%'
    OR table_name LIKE '%user%'
)
ORDER BY table_name, ordinal_position;

-- 3. 【外部キー制約】テーブル間のリレーション
SELECT
    tc.table_name AS 参照元テーブル, 
    kcu.column_name AS 参照元カラム, 
    ccu.table_name AS 参照先テーブル,
    ccu.column_name AS 参照先カラム,
    tc.constraint_name AS 制約名
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
ORDER BY tc.table_name, kcu.column_name;

-- 4. 【主キー】各テーブルの主キー情報
SELECT 
    tc.table_name,
    kcu.column_name,
    kcu.ordinal_position
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.ordinal_position;

-- 5. 【RLSポリシー】Row Level Securityの設定状況
SELECT 
    schemaname AS スキーマ名,
    tablename AS テーブル名,
    policyname AS ポリシー名,
    permissive AS 許可型,
    cmd AS コマンド,
    roles AS 対象ロール,
    qual AS 条件
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 6. 【RLS有効状態】テーブルのRLS有効/無効状態
SELECT 
    schemaname AS スキーマ名,
    tablename AS テーブル名,
    rowsecurity AS RLS有効
FROM pg_tables 
WHERE schemaname = 'public'
AND (
    tablename LIKE '%quiz%' 
    OR tablename LIKE '%playlist%'
    OR tablename LIKE '%youtube%'
    OR tablename LIKE '%user%'
)
ORDER BY tablename;

-- 7. 【インデックス】作成されているインデックス
SELECT 
    schemaname AS スキーマ名,
    tablename AS テーブル名,
    indexname AS インデックス名,
    indexdef AS 定義
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 8. 【関数】カスタム関数（generate_room_codeなど）
SELECT 
    routine_name AS 関数名,
    routine_type AS タイプ,
    data_type AS 戻り値型,
    routine_definition AS 定義
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%room%'
ORDER BY routine_name;

-- 9. 【トリガー】設定されているトリガー
SELECT 
    trigger_name AS トリガー名,
    event_object_table AS テーブル名,
    event_manipulation AS イベント,
    action_timing AS タイミング,
    action_statement AS アクション
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 10. 【レコード数】各テーブルの現在のレコード数（実行に注意）
-- ※ データが大量にある場合は時間がかかる可能性があります
DO $$
DECLARE
    r RECORD;
    cnt INTEGER;
    output TEXT := '';
BEGIN
    output := output || '=== テーブル別レコード数 ===' || CHR(10);
    
    FOR r IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND (
            table_name LIKE '%quiz%' 
            OR table_name LIKE '%playlist%'
            OR table_name LIKE '%youtube%'
            OR table_name LIKE '%user%'
        )
        ORDER BY table_name
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', r.table_name) INTO cnt;
        output := output || r.table_name || ': ' || cnt || ' records' || CHR(10);
    END LOOP;
    
    RAISE NOTICE '%', output;
END $$;

-- 11. 【実際のデータサンプル】quiz_sessionsテーブルの構造確認（上位3件）
-- ※ 実際のデータがある場合のみ実行
SELECT 
    'quiz_sessions テーブルのサンプルデータ:' AS info;

SELECT * 
FROM quiz_sessions 
ORDER BY created_at DESC 
LIMIT 3;

-- 12. 【現在のスキーマ生成】CREATE TABLE文の再生成
SELECT 
    'CREATE TABLE ' || table_name || ' (' || CHR(10) ||
    string_agg(
        '  ' || column_name || ' ' || 
        CASE 
            WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
            WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
            WHEN data_type = 'uuid' THEN 'UUID'
            WHEN data_type = 'integer' THEN 'INTEGER'
            WHEN data_type = 'boolean' THEN 'BOOLEAN'
            WHEN data_type = 'text' THEN 'TEXT'
            WHEN data_type = 'jsonb' THEN 'JSONB'
            ELSE UPPER(data_type)
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE 
            WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default 
            ELSE '' 
        END,
        ',' || CHR(10) 
        ORDER BY ordinal_position
    ) || CHR(10) || ');' AS create_statement
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('quiz_sessions', 'quiz_participants', 'quiz_questions', 'quiz_answers')
GROUP BY table_name
ORDER BY table_name;