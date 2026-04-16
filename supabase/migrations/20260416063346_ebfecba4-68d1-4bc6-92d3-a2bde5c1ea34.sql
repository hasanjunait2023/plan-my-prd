ALTER TABLE public.session_pair_recommendations 
ADD COLUMN rsi_value numeric NOT NULL DEFAULT 0,
ADD COLUMN divergence_type text NOT NULL DEFAULT 'NONE',
ADD COLUMN divergence_strength text NOT NULL DEFAULT 'NONE';