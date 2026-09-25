drop function if exists public.admin_access_events(integer);

create or replace function public.current_role() returns text
language sql stable security invoker set search_path=public as $$
  select coalesce((select role from public.user_profiles where user_id = auth.uid()), 'reader');
$$;
revoke all on function public.current_role() from public;
grant execute on function public.current_role() to anon, authenticated;

create or replace function public.public_comments(p_article_slug text)
returns table(id uuid, article_slug text, parent_id uuid, body text, created_at timestamptz, edited_at timestamptz, alias text)
language sql stable security invoker set search_path=public as $$
  select c.id,c.article_slug,c.parent_id,c.body,c.created_at,c.edited_at,p.alias
  from public.comments c join public.user_profiles p on p.user_id=c.user_id
  where c.article_slug=p_article_slug and c.status='visible'
  order by c.created_at asc;
$$;
revoke all on function public.public_comments(text) from public;
grant execute on function public.public_comments(text) to anon, authenticated;

create policy "reader profile update" on public.user_profiles for update
  using (auth.uid() = user_id and role = 'reader')
  with check (auth.uid() = user_id and role = 'reader');

create or replace function public.set_my_alias(p_alias text)
returns void language plpgsql security invoker set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if char_length(trim(p_alias)) not between 3 and 40 then raise exception 'invalid alias'; end if;
  insert into public.user_profiles(user_id,alias,role) values(auth.uid(),trim(p_alias),'reader')
  on conflict(user_id) do update set alias=excluded.alias;
end;
$$;
revoke all on function public.set_my_alias(text) from public;
grant execute on function public.set_my_alias(text) to authenticated;
