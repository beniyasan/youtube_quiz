-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playlists table
CREATE TABLE public.playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- YouTube videos table
CREATE TABLE public.youtube_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    youtube_url TEXT NOT NULL,
    title TEXT NOT NULL,
    thumbnail_url TEXT,
    duration INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz rooms table
CREATE TABLE public.quiz_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_id UUID NOT NULL REFERENCES public.users(id),
    playlist_id UUID NOT NULL REFERENCES public.playlists(id),
    room_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
    max_players INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

-- Quiz participants table
CREATE TABLE public.quiz_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.quiz_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    score INTEGER DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- Quiz questions table
CREATE TABLE public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.quiz_rooms(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.youtube_videos(id),
    question_text TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    options JSONB NOT NULL,
    time_limit INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz answers table
CREATE TABLE public.quiz_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES public.quiz_participants(id) ON DELETE CASCADE,
    answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX idx_youtube_videos_playlist_id ON public.youtube_videos(playlist_id);
CREATE INDEX idx_quiz_rooms_host_id ON public.quiz_rooms(host_id);
CREATE INDEX idx_quiz_participants_room_id ON public.quiz_participants(room_id);
CREATE INDEX idx_quiz_participants_user_id ON public.quiz_participants(user_id);
CREATE INDEX idx_quiz_questions_room_id ON public.quiz_questions(room_id);
CREATE INDEX idx_quiz_answers_question_id ON public.quiz_answers(question_id);
CREATE INDEX idx_quiz_answers_participant_id ON public.quiz_answers(participant_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own data
CREATE POLICY "Users can read own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Playlists policies
CREATE POLICY "Users can CRUD own playlists" ON public.playlists
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can read public playlists" ON public.playlists
    FOR SELECT USING (true);

-- YouTube videos policies
CREATE POLICY "Users can CRUD videos in own playlists" ON public.youtube_videos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.playlists
            WHERE playlists.id = youtube_videos.playlist_id
            AND playlists.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can read videos in public playlists" ON public.youtube_videos
    FOR SELECT USING (true);

-- Quiz rooms policies
CREATE POLICY "Anyone can read quiz rooms" ON public.quiz_rooms
    FOR SELECT USING (true);

CREATE POLICY "Users can create quiz rooms" ON public.quiz_rooms
    FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their quiz rooms" ON public.quiz_rooms
    FOR UPDATE USING (auth.uid() = host_id);

-- Quiz participants policies
CREATE POLICY "Anyone can read participants" ON public.quiz_participants
    FOR SELECT USING (true);

CREATE POLICY "Users can join quiz rooms" ON public.quiz_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participation" ON public.quiz_participants
    FOR UPDATE USING (auth.uid() = user_id);

-- Quiz questions policies
CREATE POLICY "Anyone in room can read questions" ON public.quiz_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.quiz_participants
            WHERE quiz_participants.room_id = quiz_questions.room_id
            AND quiz_participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Hosts can create questions" ON public.quiz_questions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.quiz_rooms
            WHERE quiz_rooms.id = quiz_questions.room_id
            AND quiz_rooms.host_id = auth.uid()
        )
    );

-- Quiz answers policies
CREATE POLICY "Users can create their answers" ON public.quiz_answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.quiz_participants
            WHERE quiz_participants.id = quiz_answers.participant_id
            AND quiz_participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can read their answers" ON public.quiz_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.quiz_participants
            WHERE quiz_participants.id = quiz_answers.participant_id
            AND quiz_participants.user_id = auth.uid()
        )
    );

-- Realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_answers;

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, username)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'username');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();