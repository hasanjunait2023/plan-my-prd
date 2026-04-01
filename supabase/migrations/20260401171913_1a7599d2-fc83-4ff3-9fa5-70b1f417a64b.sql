
-- Create trades table
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT NOT NULL,
  pair TEXT NOT NULL,
  direction TEXT NOT NULL,
  session TEXT NOT NULL DEFAULT 'London',
  timeframe TEXT NOT NULL DEFAULT '15M',
  strategy TEXT NOT NULL DEFAULT '',
  entry_price NUMERIC NOT NULL DEFAULT 0,
  exit_price NUMERIC NOT NULL DEFAULT 0,
  stop_loss NUMERIC NOT NULL DEFAULT 0,
  take_profit NUMERIC NOT NULL DEFAULT 0,
  lot_size NUMERIC NOT NULL DEFAULT 0.01,
  risk_percent NUMERIC NOT NULL DEFAULT 0,
  risk_dollars NUMERIC NOT NULL DEFAULT 0,
  rrr NUMERIC NOT NULL DEFAULT 0,
  pnl NUMERIC NOT NULL DEFAULT 0,
  pips NUMERIC NOT NULL DEFAULT 0,
  outcome TEXT NOT NULL DEFAULT 'BREAKEVEN',
  smc_tags TEXT[] NOT NULL DEFAULT '{}',
  mistakes TEXT[] NOT NULL DEFAULT '{}',
  psychology_state INTEGER NOT NULL DEFAULT 5,
  psychology_emotion TEXT NOT NULL DEFAULT 'Calm',
  plan_adherence BOOLEAN NOT NULL DEFAULT true,
  pre_trade_notes TEXT NOT NULL DEFAULT '',
  post_trade_notes TEXT NOT NULL DEFAULT '',
  reason_for_entry TEXT NOT NULL DEFAULT '',
  confidence_level INTEGER NOT NULL DEFAULT 5,
  pre_situation TEXT NOT NULL DEFAULT '',
  during_situation TEXT NOT NULL DEFAULT '',
  post_situation TEXT NOT NULL DEFAULT '',
  what_went_well TEXT NOT NULL DEFAULT '',
  improvement_notes TEXT NOT NULL DEFAULT '',
  entry_screenshots TEXT[] NOT NULL DEFAULT '{}',
  exit_screenshots TEXT[] NOT NULL DEFAULT '{}',
  screenshots TEXT[] NOT NULL DEFAULT '{}',
  partial_closes JSONB NOT NULL DEFAULT '[]',
  starred BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create psychology_logs table
CREATE TABLE public.psychology_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT NOT NULL,
  mental_state INTEGER NOT NULL DEFAULT 5,
  sleep_quality INTEGER NOT NULL DEFAULT 5,
  life_stress INTEGER NOT NULL DEFAULT 5,
  intention TEXT NOT NULL DEFAULT '',
  reflection TEXT NOT NULL DEFAULT '',
  rule_adherence BOOLEAN NOT NULL DEFAULT true,
  emotions TEXT[] NOT NULL DEFAULT '{}',
  overall_score NUMERIC NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create account_settings table
CREATE TABLE public.account_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  starting_balance NUMERIC NOT NULL DEFAULT 10000,
  current_balance NUMERIC NOT NULL DEFAULT 10000,
  currency TEXT NOT NULL DEFAULT 'USD',
  max_risk_percent NUMERIC NOT NULL DEFAULT 1,
  daily_loss_limit NUMERIC NOT NULL DEFAULT 500,
  max_trades_per_day INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trading_rules table
CREATE TABLE public.trading_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies for trades (public access, no auth)
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on trades" ON public.trades FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert on trades" ON public.trades FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update on trades" ON public.trades FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on trades" ON public.trades FOR DELETE TO anon, authenticated USING (true);

-- RLS policies for psychology_logs
ALTER TABLE public.psychology_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on psychology_logs" ON public.psychology_logs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert on psychology_logs" ON public.psychology_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update on psychology_logs" ON public.psychology_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on psychology_logs" ON public.psychology_logs FOR DELETE TO anon, authenticated USING (true);

-- RLS policies for account_settings
ALTER TABLE public.account_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on account_settings" ON public.account_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert on account_settings" ON public.account_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update on account_settings" ON public.account_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- RLS policies for trading_rules
ALTER TABLE public.trading_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on trading_rules" ON public.trading_rules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert on trading_rules" ON public.trading_rules FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update on trading_rules" ON public.trading_rules FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on trading_rules" ON public.trading_rules FOR DELETE TO anon, authenticated USING (true);
