CREATE OR REPLACE FUNCTION public.recompute_node_progress(_node_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _avg numeric;
  _parent uuid;
BEGIN
  SELECT AVG(c.progress) INTO _avg
  FROM public.life_nodes c
  WHERE c.parent_id = _node_id AND c.status != 'archived';

  IF _avg IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.life_nodes
    SET progress = ROUND(_avg, 2),
        completed_at = CASE WHEN _avg >= 100 THEN COALESCE(completed_at, now()) ELSE NULL END,
        status = CASE WHEN _avg >= 100 THEN 'completed' ELSE status END
  WHERE id = _node_id;

  SELECT parent_id INTO _parent FROM public.life_nodes WHERE id = _node_id;
  IF _parent IS NOT NULL THEN
    PERFORM public.recompute_node_progress(_parent);
  END IF;
END;
$$;