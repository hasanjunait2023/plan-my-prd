-- Vision board import: Vision + 5 Missions
INSERT INTO public.life_nodes (user_id, type, title, description, icon, color, sort_order)
VALUES ('d44ffc42-a554-44de-ac70-913a0c7bdab3', 'vision', 'My Life Vision (2025-2036)',
  'A 12-year journey: Trading mastery, wealth-building across multiple businesses, family blessings, deep knowledge, and meaningful charity for the Ummah.',
  'Compass', '#00C9A7', 0);

INSERT INTO public.life_nodes (user_id, parent_id, type, title, description, icon, color, sort_order)
SELECT 'd44ffc42-a554-44de-ac70-913a0c7bdab3', id, 'mission', 'Trader Mastery', 'Master forex trading — consistent profitability, funded accounts, scaling capital.', 'TrendingUp', '#00C9A7', 1
FROM public.life_nodes WHERE user_id = 'd44ffc42-a554-44de-ac70-913a0c7bdab3' AND type = 'vision' LIMIT 1;

INSERT INTO public.life_nodes (user_id, parent_id, type, title, description, icon, color, sort_order)
SELECT 'd44ffc42-a554-44de-ac70-913a0c7bdab3', id, 'mission', 'Wealth & Business', '15+ businesses across trading, agriculture, real estate, e-commerce, SaaS, AI.', 'DollarSign', '#FFB627', 2
FROM public.life_nodes WHERE user_id = 'd44ffc42-a554-44de-ac70-913a0c7bdab3' AND type = 'vision' LIMIT 1;

INSERT INTO public.life_nodes (user_id, parent_id, type, title, description, icon, color, sort_order)
SELECT 'd44ffc42-a554-44de-ac70-913a0c7bdab3', id, 'mission', 'Family & Lifestyle', 'Honor parents, gift family, dream homes & cars, travel, Umrah.', 'Heart', '#FF6B9D', 3
FROM public.life_nodes WHERE user_id = 'd44ffc42-a554-44de-ac70-913a0c7bdab3' AND type = 'vision' LIMIT 1;

INSERT INTO public.life_nodes (user_id, parent_id, type, title, description, icon, color, sort_order)
SELECT 'd44ffc42-a554-44de-ac70-913a0c7bdab3', id, 'mission', 'Knowledge & Discipline', 'Read 50+ books, deep learning in psychology, economics, marketing, leadership.', 'BookOpen', '#7C3AED', 4
FROM public.life_nodes WHERE user_id = 'd44ffc42-a554-44de-ac70-913a0c7bdab3' AND type = 'vision' LIMIT 1;

INSERT INTO public.life_nodes (user_id, parent_id, type, title, description, icon, color, sort_order)
SELECT 'd44ffc42-a554-44de-ac70-913a0c7bdab3', id, 'mission', 'Deen & Charity', 'Build orphanages, feed the needy, nursing colleges, hospitals, schools.', 'Sparkles', '#06B6D4', 5
FROM public.life_nodes WHERE user_id = 'd44ffc42-a554-44de-ac70-913a0c7bdab3' AND type = 'vision' LIMIT 1;