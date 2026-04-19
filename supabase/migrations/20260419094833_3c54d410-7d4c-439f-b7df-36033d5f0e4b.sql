
-- Singleton state for rules-checkin telegram poller (separate from mind-journal poller)
create table public.telegram_rules_state (
  id int primary key check (id = 1),
  update_offset bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.telegram_rules_state (id, update_offset) values (1, 0)
  on conflict (id) do nothing;

alter table public.telegram_rules_state enable row level security;

create policy "Service role full access telegram_rules_state"
  on public.telegram_rules_state for all to service_role
  using (true) with check (true);

-- Per-day Telegram check-in interaction state
create table public.telegram_checkin_state (
  chat_id bigint not null,
  date date not null,
  user_id uuid not null,
  message_id bigint,
  selected_rule_ids uuid[] not null default '{}',
  reasons jsonb not null default '{}'::jsonb,
  status text not null default 'awaiting_choice', -- awaiting_choice | selecting | submitted
  updated_at timestamptz not null default now(),
  primary key (chat_id, date)
);

alter table public.telegram_checkin_state enable row level security;

create policy "Service role full access telegram_checkin_state"
  on public.telegram_checkin_state for all to service_role
  using (true) with check (true);

create policy "Users can view own telegram_checkin_state"
  on public.telegram_checkin_state for select to authenticated
  using (auth.uid() = user_id);
