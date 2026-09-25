-- Keep contributor credit metadata private unless deliberately exposed by RPC.

create table if not exists public.contributor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credit_name text check (credit_name is null or char_length(trim(credit_name)) between 2 and 80),
  credit_url text check (credit_url is null or credit_url ~ '^https?://'),
  credit_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.contributor_profiles enable row level security;
revoke all on public.contributor_profiles from anon, authenticated;

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
  insert into public.contributor_profiles(user_id,credit_name,credit_url,credit_enabled,updated_at)
  values(v_uid,v_name,v_url,coalesce(p_credit_enabled,true),now())
  on conflict(user_id) do update set
    credit_name=excluded.credit_name,
    credit_url=excluded.credit_url,
    credit_enabled=excluded.credit_enabled,
    updated_at=now();
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

create or replace function public.my_contributor_profile()
returns table(alias text, credit_name text, credit_url text, credit_enabled boolean,
              contact_method text, contact_value text, allow_contact boolean, public_contact boolean)
language sql stable security definer set search_path=public as $$
  select p.alias,cp.credit_name,cp.credit_url,coalesce(cp.credit_enabled,true),
         c.contact_method,c.contact_value,c.allow_contact,c.public_opt_in
  from public.user_profiles p
  left join public.contributor_profiles cp on cp.user_id=p.user_id
  left join public.contributor_contacts c on c.user_id=p.user_id
  where p.user_id=auth.uid();
$$;

create or replace function public.public_evidence_contributions(p_article_slug text)
returns table(id uuid, source_url text, relation text, summary text, verified_at timestamptz,
              credit_name text, credit_url text, public_contact_method text, public_contact_value text)
language sql stable security definer set search_path=public as $$
  select e.id,e.source_url,e.relation,e.summary,e.reviewed_at,
         case when coalesce(cp.credit_enabled,true) then coalesce(nullif(trim(cp.credit_name),''),p.alias) end,
         case when coalesce(cp.credit_enabled,true) then cp.credit_url end,
         case when coalesce(cp.credit_enabled,true) and c.allow_contact and c.public_opt_in then c.contact_method end,
         case when coalesce(cp.credit_enabled,true) and c.allow_contact and c.public_opt_in then c.contact_value end
  from public.evidence_submissions e
  join public.user_profiles p on p.user_id=e.user_id
  left join public.contributor_profiles cp on cp.user_id=e.user_id
  left join public.contributor_contacts c on c.user_id=e.user_id
  where e.article_slug=p_article_slug and e.status='verified'
  order by e.reviewed_at desc nulls last,e.created_at desc;
$$;

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
           p.alias,cp.credit_name,c.contact_method,c.contact_value,c.allow_contact,c.public_opt_in
    from public.evidence_submissions e
    join public.user_profiles p on p.user_id=e.user_id
    left join public.contributor_profiles cp on cp.user_id=e.user_id
    left join public.contributor_contacts c on c.user_id=e.user_id
    where p_status is null or e.status=p_status
    order by e.created_at desc;
end;
$$;

alter table public.user_profiles
  drop column if exists credit_name,
  drop column if exists credit_url,
  drop column if exists credit_enabled,
  drop column if exists contributor_updated_at;
