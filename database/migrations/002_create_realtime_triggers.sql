-- リアルタイム通信用のトリガー作成

-- updated_atカラムを自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- quiz_sessionsのupdated_at自動更新
CREATE TRIGGER update_quiz_sessions_updated_at 
  BEFORE UPDATE ON quiz_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Supabase Realtimeの有効化
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_answers;

-- ルームコード生成関数
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

-- スコア更新関数
CREATE OR REPLACE FUNCTION update_participant_score(
    p_participant_id UUID,
    p_points INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE quiz_participants 
    SET score = score + p_points
    WHERE id = p_participant_id;
END;
$$ LANGUAGE plpgsql;

-- セッション統計取得関数
CREATE OR REPLACE FUNCTION get_session_stats(p_session_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_participants', COUNT(*),
        'total_questions', (SELECT COUNT(*) FROM quiz_questions WHERE session_id = p_session_id),
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
            WHERE session_id = p_session_id 
            ORDER BY score DESC
        )
    ) INTO result
    FROM quiz_participants
    WHERE session_id = p_session_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;