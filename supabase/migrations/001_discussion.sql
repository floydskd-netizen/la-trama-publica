create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  alias text not null unique check (char_length(alias) between 3 and 40),
  role text not null default 'reader' check (role in ('reader','moderator','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  article_slug text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  status text not null default 'visible' check (status in ('visible','hidden','deleted','pending')),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index if not exists comments_article_created_idx on public.comments(article_slug, created_at desc);
create index if not exists comments_parent_idx on public.comments(parent_id);

create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'open' check (status in ('open','reviewed','dismissed','actioned')),
  created_at timestamptz not null default now(),
  unique(comment_id, reporter_id)
);
create table if not exists public.access_events (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('login','comment','report','session')),
  ip inet,
  user_agent text,
  device_class text,
  browser text,
  os text,
  referrer text,
  locale text,
  timezone text,
  screen_width integer,
  screen_height integer,
  country text,
  region text,
  city text,
  created_at timestamptz not null default now()
);

create index if not exists access_events_user_created_idx on public.access_events(user_id, created_at desc);
create index if not exists access_events_created_idx on public.access_events(created_at desc);

alter table public.user_profiles enable row level security;
alter table public.comments enable row level security;
alter table public.comment_reports enable row level security;
alter table public.access_events enable row level security;

create or replace function public.current_role() returns text language sql stable security definer set search_path=public as $$
  select coalesce((select role from public.user_profiles where user_id = auth.uid()), 'reader');
$$;
create policy "profiles readable" on public.user_profiles for select using (true);
create policy "own profile insert" on public.user_profiles for insert with check (auth.uid() = user_id);
create policy "own profile update" on public.user_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "visible comments readable" on public.comments for select using (status = 'visible' or user_id = auth.uid() or public.current_role() in ('moderator','admin'));
create policy "authenticated comment insert" on public.comments for insert with check (auth.uid() = user_id);
create policy "own comment update" on public.comments for update using (auth.uid() = user_id or public.current_role() in ('moderator','admin'));

create policy "own reports insert" on public.comment_reports for insert with check (auth.uid() = reporter_id);
create policy "moderators read reports" on public.comment_reports for select using (public.current_role() in ('moderator','admin'));
create policy "moderators update reports" on public.comment_reports for update using (public.current_role() in ('moderator','admin'));

-- access_events intentionally has no public read/insert policy.
-- It is written by a server-side Edge Function using the service role.
-- Administrative reads should occur only through server-side tooling or an admin-only function.

create or replace function public.public_comments(p_article_slug text)
returns table(id uuid, article_slug text, parent_id uuid, body text, created_at timestamptz, edited_at timestamptz, alias text)
language sql stable security definer set search_path=public as $$
  select c.id,c.article_slug,c.parent_id,c.body,c.created_at,c.edited_at,p.alias
  from public.comments c join public.user_profiles p on p.user_id=c.user_id
  where c.article_slug=p_article_slug and c.status='visible'
  order by c.created_at asc;
$$;
grant execute on function public.public_comments(text) to anon, authenticated;
-- Harden profile/comment permissions: users cannot self-promote roles or undo moderation.
drop policy if exists "own profile insert" on public.user_profiles;
drop policy if exists "own profile update" on public.user_profiles;
create policy "reader profile insert" on public.user_profiles for insert
  with check (auth.uid() = user_id and role = 'reader');

drop policy if exists "own comment update" on public.comments;
create policy "moderators update comments" on public.comments for update
  using (public.current_role() in ('moderator','admin'))
  with check (public.current_role() in ('moderator','admin'));

create or replace function public.set_my_alias(p_alias text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if char_length(trim(p_alias)) not between 3 and 40 then raise exception 'invalid alias'; end if;
  insert into public.user_profiles(user_id,alias,role) values(auth.uid(),trim(p_alias),'reader')
  on conflict(user_id) do update set alias=excluded.alias;
end;
$$;
grant execute on function public.set_my_alias(text) to authenticated;
create or replace function public.admin_access_events(p_limit integer default 100)
returns table(
  event_id bigint, event_time timestamptz, public_alias text, event_kind text,
  ip_address text, device_class text, browser text, os text, referrer text,
  locale text, timezone text, screen_width integer, screen_height integer,
  country text, region text, city text
) language plpgsql security definer set search_path=public as $$
begin
  if public.current_role() <> 'admin' then raise exception 'forbidden'; end if;
  return query
    select e.id,e.created_at,p.alias,e.event_type,e.ip::text,e.device_class,e.browser,e.os,e.referrer,
           e.locale,e.timezone,e.screen_width,e.screen_height,e.country,e.region,e.city
    from public.access_events e
    left join public.user_profiles p on p.user_id=e.user_id
    order by e.created_at desc
    limit greatest(1,least(coalesce(p_limit,100),500));
end;
$$;
revoke all on function public.admin_access_events(integer) from public;
grant execute on function public.admin_access_events(integer) to authenticated;
