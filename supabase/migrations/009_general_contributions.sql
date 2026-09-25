-- General participation inbox: tips, sources, documents and investigation proposals.

create table if not exists public.general_contributions (
  id uuid primary key default gen_random_uuid(),
  contribution_type text not null check (contribution_type in ('tip','source','document','correction','investigation','other')),
  topic text not null check (char_length(trim(topic)) between 3 and 200),
  details text not null check (char_length(trim(details)) between 20 and 6000),
  source_url text check (source_url is null or source_url ~ '^https?://'),
  contact_name text check (contact_name is null or char_length(trim(contact_name)) between 2 and 120),
  contact_method text check (contact_method is null or contact_method in ('email','whatsapp','telegram','phone','x','other')),
  contact_value text check (contact_value is null or char_length(trim(contact_value)) between 3 and 200),
  credit_name text check (credit_name is null or char_length(trim(credit_name)) between 2 and 120),
  allow_contact boolean not null default true,
  public_credit boolean not null default true,
  public_contact boolean not null default false,
  file_path text,
  file_name text,
  file_type text,
  file_size bigint check (file_size is null or file_size between 1 and 10485760),
  status text not null default 'pending' check (status in ('pending','reviewing','verified','rejected')),
  review_note text check (review_note is null or char_length(review_note) <= 2000),
  email_status text not null default 'pending' check (email_status in ('pending','sent','failed','skipped')),
  email_sent_at timestamptz,
  email_error text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create index if not exists general_contributions_status_created_idx on public.general_contributions(status,created_at desc);
alter table public.general_contributions enable row level security;
revoke all on public.general_contributions from anon, authenticated;

create table if not exists public.portal_private_settings (
  setting_key text primary key,
  setting_value text not null,
  updated_at timestamptz not null default now()
);
alter table public.portal_private_settings enable row level security;
revoke all on public.portal_private_settings from anon, authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('contribution-files','contribution-files',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "moderators read contribution files" on storage.objects;
create policy "moderators read contribution files" on storage.objects for select to authenticated
using (bucket_id='contribution-files' and public.current_role() in ('moderator','admin'));

create or replace function public.admin_general_contributions(p_status text default null)
returns setof public.general_contributions
language plpgsql stable security definer set search_path=public as $$
begin
  if public.current_role() not in ('moderator','admin') then raise exception 'forbidden'; end if;
  return query select * from public.general_contributions g
    where p_status is null or g.status=p_status
    order by g.created_at desc;
end;
$$;
revoke all on function public.admin_general_contributions(text) from public, anon;
grant execute on function public.admin_general_contributions(text) to authenticated;

create or replace function public.moderate_general_contribution(p_id uuid,p_status text,p_review_note text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if public.current_role() not in ('moderator','admin') then raise exception 'forbidden'; end if;
  if p_status not in ('pending','reviewing','verified','rejected') then raise exception 'invalid status'; end if;
  update public.general_contributions set status=p_status,review_note=nullif(trim(coalesce(p_review_note,'')),''),
    reviewed_at=case when p_status in ('verified','rejected') then now() else null end,
    reviewed_by=case when p_status in ('verified','rejected') then auth.uid() else null end
  where id=p_id;
  if not found then raise exception 'submission not found'; end if;
end;
$$;
revoke all on function public.moderate_general_contribution(uuid,text,text) from public, anon;
grant execute on function public.moderate_general_contribution(uuid,text,text) to authenticated;
