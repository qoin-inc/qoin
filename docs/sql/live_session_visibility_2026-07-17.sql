-- LIVEカード・カレンダー表示に必要な列の補完。
-- Supabase SQL Editorで実行してください。

ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS event_date DATE,
  ADD COLUMN IF NOT EXISTS event_time TEXT,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS live_url TEXT,
  ADD COLUMN IF NOT EXISTS event_url TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE public.live_sessions
SET event_date = COALESCE(
  event_date,
  (starts_at AT TIME ZONE 'Asia/Tokyo')::date,
  (created_at AT TIME ZONE 'Asia/Tokyo')::date
)
WHERE event_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_live_sessions_neighborhood_date
  ON public.live_sessions(neighborhood_id, event_date);

NOTIFY pgrst, 'reload schema';
