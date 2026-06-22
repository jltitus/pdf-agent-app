-- Outreach Toolkit — per-activity volunteer feedback.
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query → paste → Run).

create table if not exists public.outreach_activity_feedback (
  id          uuid primary key default gen_random_uuid(),
  activity_id text not null,                                   -- matches the Toolkit activity id (e.g. 'prize-wheel')
  user_id     uuid not null references auth.users(id) on delete cascade,
  rating      int  not null check (rating between 1 and 5),
  age_tier    text,                                            -- Kids / Tweens / Teens / Adults / Mixed ages
  worked      text,                                            -- "what worked well" (shown as a volunteer tip)
  improve     text,                                            -- "what would you change"
  created_at  timestamptz not null default now()
);

create index if not exists idx_oaf_activity on public.outreach_activity_feedback (activity_id);

alter table public.outreach_activity_feedback enable row level security;

-- Any signed-in member can read all feedback (powers the per-card aggregate + volunteer tips).
create policy "oaf read (members)" on public.outreach_activity_feedback
  for select to authenticated using (true);

-- A member can add their own feedback.
create policy "oaf insert own" on public.outreach_activity_feedback
  for insert to authenticated with check (auth.uid() = user_id);

-- A member can remove their own feedback.
create policy "oaf delete own" on public.outreach_activity_feedback
  for delete to authenticated using (auth.uid() = user_id);

-- Admins can remove any feedback (moderation) — matches the app's profiles.role = 'admin' model.
create policy "oaf admin delete" on public.outreach_activity_feedback
  for delete to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
