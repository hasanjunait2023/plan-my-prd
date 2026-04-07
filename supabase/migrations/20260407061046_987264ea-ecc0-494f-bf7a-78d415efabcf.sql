-- Revert records that are actually London (hour 12-15) back to 1H
UPDATE currency_strength 
SET timeframe = '1H' 
WHERE timeframe = 'New York' 
AND EXTRACT(HOUR FROM recorded_at) < 16;
