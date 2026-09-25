create table if not exists public.analytics_events (
  id bigserial primary key,
  event_type text not null check (event_type in ('pageview','share')),
  path text not null check (char_length(path) between 1 and 500),
  article_slug text,
  visitor_hash text not null check (char_length(visitor_hash) = 64),
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  locale text,
  device_class text check (device_class is null or device_class in ('mobile','tablet','desktop')),
  target text,
  created_at timestamptz not null default now()
);
alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon, authenticated;
grant select, insert on public.analytics_events to service_role;
grant usage, select on sequence public.analytics_events_id_seq to service_role;
create index if not exists analytics_events_created_idx on public.analytics_events(created_at desc);
create index if not exists analytics_events_path_created_idx on public.analytics_events(path, created_at desc);
create index if not exists analytics_events_article_created_idx on public.analytics_events(article_slug, created_at desc);
create index if not exists analytics_events_visitor_created_idx on public.analytics_events(visitor_hash, created_at desc);

create or replace function public.admin_analytics_summary(p_days integer default 30) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb; d integer:=greatest(1,least(coalesce(p_days,30),90));
begin
  if not exists(select 1 from public.user_profiles where user_id=auth.uid() and role='admin') then raise exception 'forbidden'; end if;
  with base as (select * from public.analytics_events where created_at>=now()-make_interval(days=>d) and utm_source is distinct from 'verification'),
  views as (select * from base where event_type='pageview'), shares as (select * from base where event_type='share')
  select jsonb_build_object(
    'days',d,'pageviews',(select count(*) from views),'unique_visitors',(select count(distinct visitor_hash) from views),'shares',(select count(*) from shares),
    'top_articles',coalesce((select jsonb_agg(x) from (select article_slug name,count(*) count from views where article_slug is not null group by article_slug order by count(*) desc limit 15)x),'[]'::jsonb),
    'sources',coalesce((select jsonb_agg(x) from (select coalesce(utm_source,'(direct)') name,count(*) count from views group by coalesce(utm_source,'(direct)') order by count(*) desc limit 15)x),'[]'::jsonb),
    'referrers',coalesce((select jsonb_agg(x) from (select coalesce(referrer_host,'(direct)') name,count(*) count from views group by coalesce(referrer_host,'(direct)') order by count(*) desc limit 15)x),'[]'::jsonb),
    'campaigns',coalesce((select jsonb_agg(x) from (select coalesce(utm_campaign,'(none)') name,count(*) count from views group by coalesce(utm_campaign,'(none)') order by count(*) desc limit 15)x),'[]'::jsonb),
    'share_targets',coalesce((select jsonb_agg(x) from (select coalesce(target,'(unknown)') name,count(*) count from shares group by coalesce(target,'(unknown)') order by count(*) desc limit 15)x),'[]'::jsonb),
    'devices',coalesce((select jsonb_agg(x) from (select coalesce(device_class,'(unknown)') name,count(*) count from views group by coalesce(device_class,'(unknown)') order by count(*) desc limit 15)x),'[]'::jsonb)
  ) into result;
  return result;
end; $$;
revoke all on function public.admin_analytics_summary(integer) from public;
grant execute on function public.admin_analytics_summary(integer) to authenticated;
revoke execute on function public.admin_analytics_summary(integer) from anon;
alter function public.admin_analytics_summary(integer) set search_path = '';
