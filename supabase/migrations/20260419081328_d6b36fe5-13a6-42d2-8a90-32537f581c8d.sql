-- Add mission link to habits
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS mission_id uuid REFERENCES public.life_nodes(id) ON DELETE SET NULL;

-- Add mission link to trades (so a trader can choose which mission this trade contributes to; default null = auto-detect by mission metadata.module='trading')
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS mission_id uuid REFERENCES public.life_nodes(id) ON DELETE SET NULL;

-- Function: roll trade pnl into linked mission's current_value
CREATE OR REPLACE FUNCTION public.recompute_mission_trading_value(_mission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total numeric;
  _user uuid;
BEGIN
  SELECT user_id INTO _user FROM public.life_nodes WHERE id = _mission_id;
  IF _user IS NULL THEN RETURN; END IF;

  SELECT COALESCE(SUM(pnl), 0) INTO _total
  FROM public.trades
  WHERE user_id = _user
    AND status = 'CLOSED'
    AND (
      mission_id = _mission_id
      OR (mission_id IS NULL AND _mission_id = (
        SELECT id FROM public.life_nodes
        WHERE user_id = _user
          AND type = 'mission'
          AND (metadata->>'module' = 'trading' OR LOWER(title) LIKE '%trad%' OR LOWER(title) LIKE '%wealth%')
        ORDER BY created_at ASC
        LIMIT 1
      ))
    );

  UPDATE public.life_nodes
    SET current_value = _total
  WHERE id = _mission_id;
END;
$$;

-- Trigger function: on trade insert/update/delete, recompute the relevant trading mission(s)
CREATE OR REPLACE FUNCTION public.trade_after_change_recompute_mission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid;
  _explicit uuid;
  _auto uuid;
BEGIN
  _user := COALESCE(NEW.user_id, OLD.user_id);
  IF _user IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  -- Auto-detect default trading mission for this user
  SELECT id INTO _auto FROM public.life_nodes
    WHERE user_id = _user
      AND type = 'mission'
      AND (metadata->>'module' = 'trading' OR LOWER(title) LIKE '%trad%' OR LOWER(title) LIKE '%wealth%')
    ORDER BY created_at ASC LIMIT 1;

  IF _auto IS NOT NULL THEN
    PERFORM public.recompute_mission_trading_value(_auto);
  END IF;

  -- Also recompute any explicitly tagged mission (NEW or OLD)
  IF TG_OP <> 'DELETE' AND NEW.mission_id IS NOT NULL AND NEW.mission_id <> COALESCE(_auto, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    PERFORM public.recompute_mission_trading_value(NEW.mission_id);
  END IF;
  IF TG_OP <> 'INSERT' AND OLD.mission_id IS NOT NULL AND OLD.mission_id <> COALESCE(_auto, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    PERFORM public.recompute_mission_trading_value(OLD.mission_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trade_recompute_mission ON public.trades;
CREATE TRIGGER trade_recompute_mission
AFTER INSERT OR UPDATE OF pnl, status, mission_id OR DELETE
ON public.trades
FOR EACH ROW
EXECUTE FUNCTION public.trade_after_change_recompute_mission();

-- Helper: roll-up habit completion contribution to its linked mission (1 per completion = +1 current_value)
CREATE OR REPLACE FUNCTION public.recompute_mission_habit_value(_mission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count numeric;
  _user uuid;
BEGIN
  SELECT user_id INTO _user FROM public.life_nodes WHERE id = _mission_id;
  IF _user IS NULL THEN RETURN; END IF;

  SELECT COUNT(*)::numeric INTO _count
  FROM public.habit_logs hl
  JOIN public.habits h ON h.id = hl.habit_id
  WHERE h.user_id = _user AND h.mission_id = _mission_id;

  UPDATE public.life_nodes
    SET current_value = _count
  WHERE id = _mission_id AND metadata->>'auto_source' = 'habits';
END;
$$;