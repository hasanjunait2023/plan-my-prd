INSERT INTO public.fundamental_biases (currency, bias, event_title, actual, forecast, previous, impact, event_date, updated_at)
VALUES
  ('USD', 'Bullish', 'Non-Farm Employment Change', '256K', '180K', '212K', 'High', '2026-04-11T08:30:00-04:00', now()),
  ('EUR', 'Bearish', 'CPI y/y', '2.1%', '2.4%', '2.4%', 'High', '2026-04-10T05:00:00-04:00', now()),
  ('GBP', 'Bullish', 'GDP m/m', '0.4%', '0.1%', '0.0%', 'High', '2026-04-09T02:00:00-04:00', now()),
  ('JPY', 'Bearish', 'BOJ Policy Rate', '-0.1%', '-0.1%', '-0.1%', 'High', '2026-04-08T23:00:00-04:00', now()),
  ('AUD', 'Bullish', 'Employment Change', '52.1K', '17.9K', '48.9K', 'High', '2026-04-09T21:30:00-04:00', now()),
  ('NZD', 'Neutral', 'Official Cash Rate', '3.50%', '3.50%', '3.75%', 'High', '2026-04-08T17:00:00-04:00', now()),
  ('CAD', 'Bearish', 'Employment Change', '-12.5K', '15.0K', '22.3K', 'High', '2026-04-10T08:30:00-04:00', now()),
  ('CHF', 'Neutral', 'CPI m/m', '0.1%', '0.1%', '0.0%', 'Medium', '2026-04-07T02:30:00-04:00', now())
ON CONFLICT (currency) DO UPDATE SET
  bias = EXCLUDED.bias,
  event_title = EXCLUDED.event_title,
  actual = EXCLUDED.actual,
  forecast = EXCLUDED.forecast,
  previous = EXCLUDED.previous,
  impact = EXCLUDED.impact,
  event_date = EXCLUDED.event_date,
  updated_at = EXCLUDED.updated_at;