-- Create enum for node types
CREATE TYPE public.life_node_type AS ENUM 
  ('vision','mission','yearly','quarterly','monthly','weekly','daily');

-- Main hierarchical nodes table
CREATE TABLE public.life_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.life_nodes(id) ON DELETE CASCADE,
  type public.life_node_type NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'target',
  color text NOT NULL DEFAULT '#00C9A7',
  status text NOT NULL DEFAULT 'active',
  progress numeric NOT NULL DEFAULT 0,
  target_value numeric,
  current_value numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '',
  start_date date,
  due_date date,
  completed_at timestamptz,
  priority int NOT NULL DEFAULT 2,
  sort_order int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_life_nodes_user ON public.life_nodes(user_id);
CREATE INDEX idx_life_nodes_parent ON public.life_nodes(parent_id);
CREATE INDEX idx_life_nodes_type ON public.life_nodes(type);
CREATE INDEX idx_life_nodes_due ON public.life_nodes(due_date);

-- Daily logs / check-ins
CREATE TABLE public.life_node_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  node_id uuid NOT NULL REFERENCES public.life_nodes(id) ON DELETE CASCADE,
  date date NOT NULL,
  done boolean NOT NULL DEFAULT false,
  value_added numeric NOT NULL DEFAULT 0,
  reflection text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_life_node_logs_user_date ON public.life_node_logs(user_id, date);
CREATE INDEX idx_life_node_logs_node ON public.life_node_logs(node_id);

-- Enable RLS
ALTER TABLE public.life_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_node_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for life_nodes
CREATE POLICY "Users can view own life_nodes" ON public.life_nodes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own life_nodes" ON public.life_nodes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own life_nodes" ON public.life_nodes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own life_nodes" ON public.life_nodes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS policies for life_node_logs
CREATE POLICY "Users can view own life_node_logs" ON public.life_node_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own life_node_logs" ON public.life_node_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own life_node_logs" ON public.life_node_logs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own life_node_logs" ON public.life_node_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Updated_at trigger function (reuse existing pattern)
CREATE OR REPLACE FUNCTION public.update_life_nodes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER life_nodes_set_updated_at
  BEFORE UPDATE ON public.life_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_life_nodes_updated_at();

-- Recursive progress roll-up function
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
  -- Average progress of direct children
  SELECT AVG(progress), MAX(parent_id)
    INTO _avg, _parent
  FROM (
    SELECT progress FROM public.life_nodes WHERE parent_id = _node_id AND status != 'archived'
  ) c, public.life_nodes p WHERE p.id = _node_id;

  IF _avg IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.life_nodes
    SET progress = ROUND(_avg, 2),
        completed_at = CASE WHEN _avg >= 100 THEN COALESCE(completed_at, now()) ELSE NULL END,
        status = CASE WHEN _avg >= 100 THEN 'completed' ELSE status END
  WHERE id = _node_id;

  -- Walk up to parent
  SELECT parent_id INTO _parent FROM public.life_nodes WHERE id = _node_id;
  IF _parent IS NOT NULL THEN
    PERFORM public.recompute_node_progress(_parent);
  END IF;
END;
$$;

-- Trigger: when a life_node's progress changes, recompute parent
CREATE OR REPLACE FUNCTION public.life_node_after_progress_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.progress IS DISTINCT FROM NEW.progress) THEN
    PERFORM public.recompute_node_progress(NEW.parent_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER life_nodes_progress_rollup
  AFTER INSERT OR UPDATE OF progress ON public.life_nodes
  FOR EACH ROW EXECUTE FUNCTION public.life_node_after_progress_change();

-- Trigger: when a log is inserted/updated, set the daily node's progress to 100 (or 0)
CREATE OR REPLACE FUNCTION public.life_node_log_apply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.life_nodes
    SET progress = CASE WHEN NEW.done THEN 100 ELSE 0 END,
        current_value = current_value + COALESCE(NEW.value_added, 0)
  WHERE id = NEW.node_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER life_node_logs_apply
  AFTER INSERT OR UPDATE ON public.life_node_logs
  FOR EACH ROW EXECUTE FUNCTION public.life_node_log_apply();

-- Realtime
ALTER TABLE public.life_nodes REPLICA IDENTITY FULL;
ALTER TABLE public.life_node_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.life_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.life_node_logs;