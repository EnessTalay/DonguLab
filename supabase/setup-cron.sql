-- Run as project postgres/admin AFTER enabling pg_cron in Dashboard > Database > Extensions.
-- Idempotent scheduler installation. Never grant app_private helpers to clients.
do $$
declare old_job bigint;
begin
  select jobid into old_job from cron.job where jobname = 'dongulab-expire-reservations';
  if old_job is not null then perform cron.unschedule(old_job); end if;
  perform cron.schedule('dongulab-expire-reservations','* * * * *','select public.refresh_reservations()');
end $$;
