-- Reader evidence contributions and explicit contributor credits.

alter table public.user_profiles
  add column if not exists credit_name text,
  add column if not exists credit_url text,
  add column if not exists credit_enabled boolean not null default true,
  add column if not exists contributor_updated_at timestamptz;

alter table public.user_profiles drop constraint if exists user_profiles_credit_name_check;
alter table public.user_profiles add constraint user_profiles_credit_name_check
  check (credit_name is null or char_length(trim(credit_name)) between 2 and 80);
alter table public.user_profiles drop constraint if exists user_profiles_credit_url_check;
alter table public.user_profiles add constraint user_profiles_credit_url_check
  check (credit_url is null or credit_url ~ '^https?://');

create table if not exists public.contributor_contacts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  contact_method text not null check (contact_method in ('email','whatsapp','telegram','phone','x','other')),
  contact_value text not null check (char_length(trim(contact_value)) between 3 and 200),
  allow_contact boolean not null default true,
  public_opt_in boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.evidence_submissions (
  id uuid primary key default gen_random_uuid(),
  article_slug text not null check (char_length(article_slug) between 1 and 200),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_url text not null check (char_length(source_url) between 8 and 2000),
  relation text not null check (relation in ('confirms','contradicts','context','correction','document','other')),
  summary text not null check (char_length(trim(summary)) between 5 and 2000),
  status text not null default 'pending' check (status in ('pending','reviewing','verified','rejected')),
  review_note text check (review_note is null or char_length(review_note) <= 2000),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create index if not exists evidence_submissions_article_status_idx
  on public.evidence_submissions(article_slug,status,created_at desc);
create index if not exists evidence_submissions_user_created_idx
  on public.evidence_submissions(user_id,created_at desc);

alter table public.contributor_contacts enable row level security;
alter table public.evidence_submissions enable row level security;
revoke all on public.contributor_contacts from anon, authenticated;
revoke all on public.evidence_submissions from anon, authenticated;

create or replace function public.save_contributor_profile(
  p_credit_name text,
  p_credit_url text,
  p_credit_enabled boolean,
  p_contact_method text,
  p_contact_value text,
  p_allow_contact boolean,
  p_public_contact boolean
) returns void
language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid := auth.uid();
  v_name text := nullif(trim(coalesce(p_credit_name,'')), '');
  v_url text := nullif(trim(coalesce(p_credit_url,'')), '');
  v_method text := nullif(trim(coalesce(p_contact_method,'')), '');
  v_value text := nullif(trim(coalesce(p_contact_value,'')), '');
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if not exists(select 1 from public.user_profiles where user_id=v_uid) then raise exception 'public alias required'; end if;
  if v_name is not null and char_length(v_name) not between 2 and 80 then raise exception 'invalid credit name'; end if;
  if v_url is not null and v_url !~ '^https?://' then raise exception 'credit URL must start with http:// or https://'; end if;
  update public.user_profiles
     set credit_name=v_name, credit_url=v_url, credit_enabled=coalesce(p_credit_enabled,true), contributor_updated_at=now()
   where user_id=v_uid;
  if v_method is null and v_value is null then
    delete from public.contributor_contacts where user_id=v_uid;
  else
    if v_method not in ('email','whatsapp','telegram','phone','x','other') or v_value is null then raise exception 'invalid contact preference'; end if;
    insert into public.contributor_contacts(user_id,contact_method,contact_value,allow_contact,public_opt_in,updated_at)
    values(v_uid,v_method,v_value,coalesce(p_allow_contact,true),coalesce(p_public_contact,false),now())
    on conflict(user_id) do update set
      contact_method=excluded.contact_method,
      contact_value=excluded.contact_value,
      allow_contact=excluded.allow_contact,
      public_opt_in=excluded.public_opt_in,
      updated_at=now();
  end if;
end;
$$;
revoke all on function public.save_contributor_profile(text,text,boolean,text,text,boolean,boolean) from public;
grant execute on function public.save_contributor_profile(text,text,boolean,text,text,boolean,boolean) to authenticated;

create or replace function public.my_contributor_profile()
returns table(alias text, credit_name text, credit_url text, credit_enabled boolean,
              contact_method text, contact_value text, allow_contact boolean, public_contact boolean)
language sql stable security definer set search_path=public as $$
  select p.alias,p.credit_name,p.credit_url,p.credit_enabled,
         c.contact_method,c.contact_value,c.allow_contact,c.public_opt_in
  from public.user_profiles p
  left join public.contributor_contacts c on c.user_id=p.user_id
  where p.user_id=auth.uid();
$$;
revoke all on function public.my_contributor_profile() from public;
grant execute on function public.my_contributor_profile() to authenticated;

create or replace function public.submit_evidence(
  p_article_slug text, p_source_url text, p_relation text, p_summary text
) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_url text := trim(coalesce(p_source_url,''));
  v_summary text := trim(coalesce(p_summary,''));
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if not exists(select 1 from public.user_profiles where user_id=v_uid) then raise exception 'public alias required'; end if;
  if char_length(trim(coalesce(p_article_slug,''))) not between 1 and 200 then raise exception 'invalid article'; end if;
  if v_url !~ '^https?://' or char_length(v_url) > 2000 then raise exception 'source URL must start with http:// or https://'; end if;
  if p_relation not in ('confirms','contradicts','context','correction','document','other') then raise exception 'invalid contribution type'; end if;
  if char_length(v_summary) not between 5 and 2000 then raise exception 'summary must contain between 5 and 2000 characters'; end if;
  insert into public.evidence_submissions(article_slug,user_id,source_url,relation,summary,status)
  values(trim(p_article_slug),v_uid,v_url,p_relation,v_summary,'pending') returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.submit_evidence(text,text,text,text) from public;
grant execute on function public.submit_evidence(text,text,text,text) to authenticated;

create or replace function public.my_evidence_submissions(p_article_slug text)
returns table(id uuid, source_url text, relation text, summary text, status text,
              review_note text, created_at timestamptz, reviewed_at timestamptz)
language sql stable security definer set search_path=public as $$
  select e.id,e.source_url,e.relation,e.summary,e.status,e.review_note,e.created_at,e.reviewed_at
  from public.evidence_submissions e
  where e.user_id=auth.uid() and e.article_slug=p_article_slug
  order by e.created_at desc;
$$;
revoke all on function public.my_evidence_submissions(text) from public;
grant execute on function public.my_evidence_submissions(text) to authenticated;

create or replace function public.public_evidence_contributions(p_article_slug text)
returns table(id uuid, source_url text, relation text, summary text, verified_at timestamptz,
              credit_name text, credit_url text, public_contact_method text, public_contact_value text)
language sql stable security definer set search_path=public as $$
  select e.id,e.source_url,e.relation,e.summary,e.reviewed_at,
         case when p.credit_enabled then coalesce(nullif(trim(p.credit_name),''),p.alias) end,
         case when p.credit_enabled then p.credit_url end,
         case when p.credit_enabled and c.allow_contact and c.public_opt_in then c.contact_method end,
         case when p.credit_enabled and c.allow_contact and c.public_opt_in then c.contact_value end
  from public.evidence_submissions e
  join public.user_profiles p on p.user_id=e.user_id
  left join public.contributor_contacts c on c.user_id=e.user_id
  where e.article_slug=p_article_slug and e.status='verified'
  order by e.reviewed_at desc nulls last,e.created_at desc;
$$;
revoke all on function public.public_evidence_contributions(text) from public;
grant execute on function public.public_evidence_contributions(text) to anon, authenticated;

create or replace function public.admin_evidence_submissions(p_status text default null)
returns table(id uuid, article_slug text, source_url text, relation text, summary text, status text,
              review_note text, created_at timestamptz, reviewed_at timestamptz,
              public_alias text, credit_name text, contact_method text, contact_value text,
              allow_contact boolean, public_contact boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  if public.current_role() not in ('moderator','admin') then raise exception 'forbidden'; end if;
  return query
    select e.id,e.article_slug,e.source_url,e.relation,e.summary,e.status,e.review_note,e.created_at,e.reviewed_at,
           p.alias,p.credit_name,c.contact_method,c.contact_value,c.allow_contact,c.public_opt_in
    from public.evidence_submissions e
    join public.user_profiles p on p.user_id=e.user_id
    left join public.contributor_contacts c on c.user_id=e.user_id
    where p_status is null or e.status=p_status
    order by e.created_at desc;
end;
$$;
revoke all on function public.admin_evidence_submissions(text) from public;
grant execute on function public.admin_evidence_submissions(text) to authenticated;

create or replace function public.moderate_evidence_submission(p_id uuid, p_status text, p_review_note text default null)
returns void
language plpgsql security definer set search_path=public as $$
begin
  if public.current_role() not in ('moderator','admin') then raise exception 'forbidden'; end if;
  if p_status not in ('pending','reviewing','verified','rejected') then raise exception 'invalid status'; end if;
  update public.evidence_submissions
     set status=p_status,
         review_note=nullif(trim(coalesce(p_review_note,'')),''),
         reviewed_at=case when p_status in ('verified','rejected') then now() else null end,
         reviewed_by=case when p_status in ('verified','rejected') then auth.uid() else null end
   where id=p_id;
  if not found then raise exception 'submission not found'; end if;
end;
$$;
revoke all on function public.moderate_evidence_submission(uuid,text,text) from public;
grant execute on function public.moderate_evidence_submission(uuid,text,text) to authenticated;
