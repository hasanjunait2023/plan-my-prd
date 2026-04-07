-- Add proof_url column to habit_logs
ALTER TABLE public.habit_logs ADD COLUMN IF NOT EXISTS proof_url text;

-- Create storage bucket for habit proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('habit-proofs', 'habit-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view habit proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'habit-proofs');

CREATE POLICY "Service role can upload habit proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'habit-proofs');

CREATE POLICY "Service role can delete habit proofs"
ON storage.objects FOR DELETE
USING (bucket_id = 'habit-proofs');