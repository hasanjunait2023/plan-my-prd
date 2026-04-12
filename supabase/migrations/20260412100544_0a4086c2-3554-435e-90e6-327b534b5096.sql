CREATE TABLE public.fundamental_biases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  currency TEXT NOT NULL,
  bias TEXT NOT NULL DEFAULT 'Neutral',
  event_title TEXT NOT NULL DEFAULT '',
  actual TEXT NOT NULL DEFAULT '',
  forecast TEXT NOT NULL DEFAULT '',
  previous TEXT NOT NULL DEFAULT '',
  impact TEXT NOT NULL DEFAULT 'Medium',
  event_date TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(currency)
);