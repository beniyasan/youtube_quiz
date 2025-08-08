-- より安全なデータクリア版
-- ユーザー情報（users, auth.usersテーブル）は完全に保持
-- その他のクイズ関連データのみクリア

-- ============================================
-- データクリア確認
-- ============================================

-- 現在のデータ量を確認（実行前に）
SELECT 'Before cleanup:' as status;
SELECT 
    'users' as table_name, 
    COUNT(*) as record_count 
FROM users
UNION ALL
SELECT 
    'playlists' as table_name, 
    COUNT(*) as record_count 
FROM playlists
UNION ALL
SELECT 
    'youtube_videos' as table_name, 
    COUNT(*) as record_count 
FROM youtube_videos
UNION ALL
SELECT 
    'quiz_sessions' as table_name, 
    COUNT(*) as record_count 
FROM quiz_sessions
UNION ALL
SELECT 
    'quiz_participants' as table_name, 
    COUNT(*) as record_count 
FROM quiz_participants
UNION ALL
SELECT 
    'quiz_questions' as table_name, 
    COUNT(*) as record_count 
FROM quiz_questions
UNION ALL
SELECT 
    'quiz_answers' as table_name, 
    COUNT(*) as record_count 
FROM quiz_answers;

-- ============================================
-- 安全なデータクリア
-- ============================================

-- 外部キー制約の順序を考慮して削除
-- 1. 最も依存関係の深いテーブルから
DELETE FROM quiz_answers;

-- 2. quiz_questions (quiz_answersが参照)
DELETE FROM quiz_questions;

-- 3. quiz_participants (quiz_answersが参照)
DELETE FROM quiz_participants;

-- 4. quiz_sessions (quiz_participants, quiz_questionsが参照)
DELETE FROM quiz_sessions;

-- 5. youtube_videos (quiz_questionsが参照の可能性)
DELETE FROM youtube_videos;

-- 6. playlists (quiz_sessions, youtube_videosが参照)
-- ただし、usersテーブルとの関連は保持
DELETE FROM playlists;

-- usersテーブルは完全に保持（削除しない）
-- auth.usersテーブルも自動的に保持される

-- ============================================
-- クリア後の確認
-- ============================================

SELECT 'After cleanup:' as status;
SELECT 
    'users' as table_name, 
    COUNT(*) as record_count 
FROM users
UNION ALL
SELECT 
    'playlists' as table_name, 
    COUNT(*) as record_count 
FROM playlists
UNION ALL
SELECT 
    'youtube_videos' as table_name, 
    COUNT(*) as record_count 
FROM youtube_videos
UNION ALL
SELECT 
    'quiz_sessions' as table_name, 
    COUNT(*) as record_count 
FROM quiz_sessions
UNION ALL
SELECT 
    'quiz_participants' as table_name, 
    COUNT(*) as record_count 
FROM quiz_participants
UNION ALL
SELECT 
    'quiz_questions' as table_name, 
    COUNT(*) as record_count 
FROM quiz_questions
UNION ALL
SELECT 
    'quiz_answers' as table_name, 
    COUNT(*) as record_count 
FROM quiz_answers;

-- ============================================
-- 保持されるデータ
-- ============================================
-- ✅ users テーブル: 完全保持
-- ✅ auth.users テーブル: 完全保持（Supabase認証）
-- 
-- ❌ 削除されるデータ:
-- - プレイリスト
-- - YouTube動画データ
-- - クイズセッション
-- - クイズ参加者
-- - クイズ問題
-- - クイズ回答
--
-- 📝 これにより:
-- - ユーザーは再ログイン不要
-- - ただし、作成したプレイリストやクイズは削除される
-- - スキーマ修正後、新しいデータで動作確認可能