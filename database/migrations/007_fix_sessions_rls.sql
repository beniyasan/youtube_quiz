-- quiz_sessionsのRLSを一時的に無効化してテスト

-- 全てのRLSポリシーを削除
DROP POLICY IF EXISTS "Users can view quiz sessions they participate in" ON quiz_sessions;
DROP POLICY IF EXISTS "Users can create quiz sessions" ON quiz_sessions;
DROP POLICY IF EXISTS "Session hosts can update their sessions" ON quiz_sessions;

-- RLSを無効化
ALTER TABLE quiz_sessions DISABLE ROW LEVEL SECURITY;

-- quiz_participantsも同様に一時的に無効化
DROP POLICY IF EXISTS "Users can view participants in their sessions" ON quiz_participants;
DROP POLICY IF EXISTS "Users can join sessions" ON quiz_participants;

ALTER TABLE quiz_participants DISABLE ROW LEVEL SECURITY;