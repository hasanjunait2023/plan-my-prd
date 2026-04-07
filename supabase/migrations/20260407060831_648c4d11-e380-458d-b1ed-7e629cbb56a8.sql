UPDATE currency_strength 
SET timeframe = 'New York' 
WHERE timeframe = '1H' 
AND EXTRACT(HOUR FROM recorded_at) >= 12;