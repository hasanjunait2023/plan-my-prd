
-- Create mind_thoughts table
CREATE TABLE public.mind_thoughts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  image_url text,
  source text NOT NULL DEFAULT 'web',
  telegram_message_id bigint,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  date text NOT NULL
);

CREATE INDEX idx_mind_thoughts_date ON public.mind_thoughts(date DESC);
CREATE INDEX idx_mind_thoughts_user ON public.mind_thoughts(user_id);

-- Enable RLS
ALTER TABLE public.mind_thoughts ENABLE ROW LEVEL SECURITY;

-- User CRUD policies
CREATE POLICY "Users can view own mind_thoughts"
  ON public.mind_thoughts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mind_thoughts"
  ON public.mind_thoughts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mind_thoughts"
  ON public.mind_thoughts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mind_thoughts"
  ON public.mind_thoughts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access mind_thoughts"
  ON public.mind_thoughts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Storage bucket for mind images
INSERT INTO storage.buckets (id, name, public)
VALUES ('mind-images', 'mind-images', true);

CREATE POLICY "Anyone can view mind-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'mind-images');

CREATE POLICY "Authenticated users can upload mind-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'mind-images');

CREATE POLICY "Service role full access mind-images"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'mind-images')
  WITH CHECK (bucket_id = 'mind-images');

-- Add mind_journal_chat_id to alert_settings
ALTER TABLE public.alert_settings
  ADD COLUMN mind_journal_chat_id text;
