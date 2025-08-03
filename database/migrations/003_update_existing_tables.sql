-- 既存テーブルを新しいクイズシステムに対応させる

-- quiz_roomsテーブルに必要なカラムを追加
ALTER TABLE public.quiz_rooms 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS current_question_index INTEGER DEFAULT 0;

-- youtube_videosテーブルに必要なカラムを追加  
ALTER TABLE public.youtube_videos
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_id TEXT;

-- video_idカラムの値を設定（youtube_urlからvideo_idを抽出）
UPDATE public.youtube_videos 
SET video_id = CASE 
  WHEN youtube_url LIKE '%youtube.com/watch?v=%' THEN 
    split_part(split_part(youtube_url, 'v=', 2), '&', 1)
  WHEN youtube_url LIKE '%youtu.be/%' THEN 
    split_part(split_part(youtube_url, 'youtu.be/', 2), '?', 1)
  ELSE NULL
END
WHERE video_id IS NULL;

-- quiz_participantsテーブルに必要なカラムを追加
ALTER TABLE public.quiz_participants
ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS is_buzzer_pressed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS buzzer_pressed_at TIMESTAMPTZ;

-- display_nameを設定（usersテーブルのusernameから取得）
UPDATE public.quiz_participants 
SET display_name = users.username
FROM public.users 
WHERE quiz_participants.user_id = users.id 
AND quiz_participants.display_name = '';

-- quiz_questionsテーブルに必要なカラムを追加
ALTER TABLE public.quiz_questions
ADD COLUMN IF NOT EXISTS video_title TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS correct_answers TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS question_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS session_id UUID;

-- session_idを設定（room_idから）
UPDATE public.quiz_questions 
SET session_id = room_id 
WHERE session_id IS NULL;

-- quiz_answersテーブルに必要なカラムを追加
ALTER TABLE public.quiz_answers
ADD COLUMN IF NOT EXISTS stage INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS points_awarded INTEGER DEFAULT 0;

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
    WHILE EXISTS(SELECT 1 FROM quiz_rooms WHERE room_code = result) LOOP
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
        'total_questions', (SELECT COUNT(*) FROM quiz_questions WHERE room_id = p_session_id),
        'current_question', (SELECT current_question_index FROM quiz_rooms WHERE id = p_session_id),
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

-- 必要なインデックスを追加
CREATE INDEX IF NOT EXISTS idx_quiz_rooms_room_code ON public.quiz_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_video_id ON public.youtube_videos(video_id);