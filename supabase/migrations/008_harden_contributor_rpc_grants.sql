-- Restrict contributor RPC execution to the minimum required roles.

revoke execute on function public.save_contributor_profile(text,text,boolean,text,text,boolean,boolean) from anon;
revoke execute on function public.my_contributor_profile() from anon;
revoke execute on function public.submit_evidence(text,text,text,text) from anon;
revoke execute on function public.my_evidence_submissions(text) from anon;
revoke execute on function public.admin_evidence_submissions(text) from anon;
revoke execute on function public.moderate_evidence_submission(uuid,text,text) from anon;

grant execute on function public.public_evidence_contributions(text) to anon, authenticated;
