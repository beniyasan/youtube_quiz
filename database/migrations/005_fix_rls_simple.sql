-- 段階的にRLSポリシーを修正

-- quiz_sessionsテーブルのSELECTポリシーを修正
DROP POLICY IF EXISTS "Users can view quiz sessions they participate in" ON quiz_sessions;

CREATE POLICY "Users can view quiz sessions they participate in" ON quiz_sessions
  FOR SELECT USING (
    host_user_id = auth.uid() OR 
    id IN (SELECT room_id FROM quiz_participants WHERE user_id = auth.uid())
  );

-- quiz_participantsテーブルのポリシーを修正
DROP POLICY IF EXISTS "Users can view participants in their sessions" ON quiz_participants;

CREATE POLICY "Users can view participants in their sessions" ON quiz_participants
  FOR SELECT USING (
    room_id IN (
      SELECT id FROM quiz_sessions 
      WHERE host_user_id = auth.uid() OR 
            id IN (SELECT room_id FROM quiz_participants WHERE user_id = auth.uid())
    )
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

-- generate_room_code関数を修正してRLSの影響を受けないようにする
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER  -- この関数は定義者の権限で実行される
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    
    -- 重複チェック（SECURITY DEFINERでRLSを回避）
    WHILE EXISTS(SELECT 1 FROM quiz_sessions WHERE room_code = result) LOOP
        result := '';
        FOR i IN 1..6 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
        END LOOP;
    END LOOP;
    
    RETURN result;
END;
$$;

-- リアルタイム機能を確実に有効化
DO $$
BEGIN
    -- quiz_participantsテーブルをリアルタイム対象に追加
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE quiz_participants;
    EXCEPTION
        WHEN duplicate_object THEN 
            -- 既に追加済みの場合は何もしない
            NULL;
    END;
END $$;