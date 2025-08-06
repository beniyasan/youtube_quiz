-- RLSポリシーの無限再帰を修正

-- 問題のあるポリシーを削除
DROP POLICY IF EXISTS "Users can view participants in their sessions" ON quiz_participants;

-- 修正版のポリシーを作成（再帰を避ける）
CREATE POLICY "Users can view participants in their sessions" ON quiz_participants
  FOR SELECT USING (
    -- 自分が参加しているセッションの参加者一覧を見ることができる
    user_id = auth.uid() OR
    -- またはセッションのホストである
    room_id IN (
      SELECT id FROM quiz_sessions 
      WHERE host_user_id = auth.uid()
    )
  );

-- quiz_sessionsのポリシーも簡素化（無限再帰を避ける）
DROP POLICY IF EXISTS "Users can view quiz sessions they participate in" ON quiz_sessions;

CREATE POLICY "Users can view quiz sessions they participate in" ON quiz_sessions
  FOR SELECT USING (
    -- 自分がホストのセッション
    host_user_id = auth.uid() OR
    -- 自分が参加しているセッション（シンプルなEXISTS）
    EXISTS (
      SELECT 1 FROM quiz_participants 
      WHERE quiz_participants.room_id = quiz_sessions.id 
      AND quiz_participants.user_id = auth.uid()
    )
  );