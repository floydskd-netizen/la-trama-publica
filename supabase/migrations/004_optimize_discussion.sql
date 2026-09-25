create index if not exists comments_user_idx on public.comments(user_id);
create index if not exists comment_reports_reporter_idx on public.comment_reports(reporter_id);

drop policy if exists "visible comments readable" on public.comments;
create policy "visible comments readable" on public.comments for select
  using (status='visible' or user_id=(select auth.uid()) or public.current_role() in ('moderator','admin'));

drop policy if exists "authenticated comment insert" on public.comments;
create policy "authenticated comment insert" on public.comments for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "own reports insert" on public.comment_reports;
create policy "own reports insert" on public.comment_reports for insert
  with check ((select auth.uid()) = reporter_id);

drop policy if exists "reader profile insert" on public.user_profiles;
create policy "reader profile insert" on public.user_profiles for insert
  with check ((select auth.uid()) = user_id and role='reader');

drop policy if exists "reader profile update" on public.user_profiles;
create policy "reader profile update" on public.user_profiles for update
  using ((select auth.uid()) = user_id and role='reader')
  with check ((select auth.uid()) = user_id and role='reader');
