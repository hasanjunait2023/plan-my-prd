DELETE FROM public.currency_strength
WHERE (recorded_at, timeframe) IN (
  SELECT recorded_at, timeframe
  FROM public.currency_strength
  GROUP BY recorded_at, timeframe
  HAVING SUM(ABS(strength)) = 0
);