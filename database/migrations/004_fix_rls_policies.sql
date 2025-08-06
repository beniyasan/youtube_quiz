-- RLSポリシーを修正してroom_idを使用するよう変更

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view participants in their sessions" ON quiz_participants;
DROP POLICY IF EXISTS "Users can view questions in their sessions" ON quiz_questions;
DROP POLICY IF EXISTS "Users can view answers in their sessions" ON quiz_answers;
DROP POLICY IF EXISTS "Session hosts can create questions" ON quiz_questions;
DROP POLICY IF EXISTS "Participants can submit answers" ON quiz_answers;

-- 修正されたポリシーを作成 (room_idを使用)
CREATE POLICY "Users can view participants in their sessions" ON quiz_participants
  FOR SELECT USING (
    room_id IN (
      SELECT id FROM quiz_sessions 
      WHERE host_user_id = auth.uid() OR 
            id IN (SELECT room_id FROM quiz_participants WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can view questions in their sessions" ON quiz_questions
  FOR SELECT USING (
    room_id IN (
      SELECT id FROM quiz_sessions 
      WHERE host_user_id = auth.uid() OR 
            id IN (SELECT room_id FROM quiz_participants WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can view answers in their sessions" ON quiz_answers
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM quiz_sessions 
      WHERE host_user_id = auth.uid() OR 
            id IN (SELECT room_id FROM quiz_participants WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Session hosts can create questions" ON quiz_questions
  FOR INSERT WITH CHECK (
    room_id IN (SELECT id FROM quiz_sessions WHERE host_user_id = auth.uid())
  );

CREATE POLICY "Participants can submit answers" ON quiz_answers
  FOR INSERT WITH CHECK (
    participant_id IN (SELECT id FROM quiz_participants WHERE user_id = auth.uid())
  );

-- get_session_stats関数を修正してroom_idを使用
CREATE OR REPLACE FUNCTION get_session_stats(p_session_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_participants', COUNT(*),
        'total_questions', (SELECT COUNT(*) FROM quiz_questions WHERE room_id = p_session_id),
        'current_question', (SELECT current_question_index FROM quiz_sessions WHERE id = p_session_id),
        'leaderboard', (
            SELECT json_agg(
                json_build_object(
                    'participant_id', id,
                    'display_name', display_name,
                    'score', score,
                    'rank', ROW_NUMBER() OVER (ORDER BY score DESC)
                )
            ) 
            FROM quiz_participants 
            WHERE room_id = p_session_id 
            ORDER BY score DESC
        )
    ) INTO result
    FROM quiz_participants
    WHERE room_id = p_session_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- リアルタイム機能を有効化（既に有効になっている場合はエラーを無視）
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE quiz_sessions;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE quiz_participants;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE quiz_questions;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE quiz_answers;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;