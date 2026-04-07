
-- Habits table
CREATE TABLE public.habits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  submission_time time NOT NULL DEFAULT '07:00',
  timezone text NOT NULL DEFAULT 'Asia/Dhaka',
  created_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  total_completions integer NOT NULL DEFAULT 0
);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habits" ON public.habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habits" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON public.habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON public.habits FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access habits" ON public.habits FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Habit logs table
CREATE TABLE public.habit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  date date NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'app',
  notes text NOT NULL DEFAULT '',
  UNIQUE(habit_id, date)
);

ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habit_logs" ON public.habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit_logs" ON public.habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habit_logs" ON public.habit_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habit_logs" ON public.habit_logs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access habit_logs" ON public.habit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Habit reminders table
CREATE TABLE public.habit_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  date date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  responded boolean NOT NULL DEFAULT false
);

ALTER TABLE public.habit_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role insert habit_reminders" ON public.habit_reminders FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role update habit_reminders" ON public.habit_reminders FOR UPDATE TO service_role USING (true);
CREATE POLICY "Authenticated read habit_reminders" ON public.habit_reminders FOR SELECT TO authenticated USING (true);
