CREATE POLICY "Users insert their own insights"
ON public.lifeos_ai_insights
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);