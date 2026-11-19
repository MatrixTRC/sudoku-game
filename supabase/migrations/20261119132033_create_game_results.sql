create table public.game_results (
  id uuid primary key default gen_random_uuid(),
  player_nickname text not null,
  puzzle_id text not null,
  completed_at timestamptz not null default now(),
  constraint game_results_nickname_check check (
    char_length(player_nickname) between 1 and 40
    and player_nickname ~ '[^[:space:]]'
  ),
  constraint game_results_puzzle_id_check check (
    char_length(puzzle_id) between 1 and 128
    and puzzle_id ~ '[^[:space:]]'
  )
);

alter table public.game_results enable row level security;

revoke all privileges on table public.game_results from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on table public.game_results to anon, authenticated;
grant insert (player_nickname, puzzle_id) on public.game_results to anon, authenticated;

create policy game_results_read
  on public.game_results
  for select
  to anon, authenticated
  using (true);

create policy game_results_submit
  on public.game_results
  for insert
  to anon, authenticated
  with check (true);
