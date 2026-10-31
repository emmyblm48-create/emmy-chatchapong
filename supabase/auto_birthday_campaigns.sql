-- 🎂 Auto Birthday Campaigns (2026-11-01)
-- On day 1 of every month (Asia/Bangkok) the system opens a member campaign for every member born that month,
-- recorded as opened by the system account 48-480 (BLM48). Same rows/backfill as open_member_campaign.
-- Eligible = members.status not Graduated + has a member account (users.role = member) that is not suspended.
-- Idempotent: a member who already has a campaign this month is skipped (UNIQUE member_name, year_month).
-- Runs only on day 1 so a campaign an admin deletes later in the month is not re-opened.

create or replace function public.auto_open_birthday_campaigns(p_force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  c_opener constant text := '48-480';
  v_bkk timestamp := now() at time zone 'Asia/Bangkok';
  v_ym text := to_char(v_bkk, 'YYYY-MM');
  v_end timestamptz := (date_trunc('month', v_bkk) + interval '1 month') at time zone 'Asia/Bangkok';
  v_day_start timestamptz := date_trunc('day', v_bkk) at time zone 'Asia/Bangkok';
  v_member record;
  v_row public.member_campaigns;
  v_opened text[] := '{}';
begin
  if extract(day from v_bkk) <> 1 and not p_force then
    return jsonb_build_object('status', 'skipped', 'reason', 'not day 1 (Asia/Bangkok)', 'yearMonth', v_ym);
  end if;

  for v_member in
    select m.*
    from public.members m
    where m.birthday is not null
      and extract(month from m.birthday) = extract(month from v_bkk)
      and lower(coalesce(m.status, '')) <> 'graduated'
      and exists (select 1 from public.users u
                  where lower(u.name) = lower(m.name) and lower(coalesce(u.role, '')) = 'member'
                    and lower(coalesce(u.status, '')) <> 'suspended')
      and not exists (select 1 from public.member_campaigns c
                      where lower(c.member_name) = lower(m.name) and c.year_month = v_ym)
    order by m.birthday, m.name
  loop
    insert into public.member_campaigns (member_name, member_username, year_month, end_at, is_birth_month)
    values (v_member.name, c_opener, v_ym, v_end, true)
    on conflict (member_name, year_month) do nothing
    returning * into v_row;
    if not found then continue; end if;

    -- cookies / engagement given earlier today count toward the campaign (same as open_member_campaign)
    insert into public.campaign_supports (campaign_id, wallet_code, amount, created_at, source)
    select v_row.id, w.wallet_code, w.amount, w.created_at, 'cookie'
    from public.wallet_logs w join public.user_wallets uw on uw.wallet_code = w.wallet_code join public.users u on u.username = uw.username
    where w.action = 'Give Cookie' and lower(w.target) = lower(v_member.name) and lower(u.role) = 'user'
      and w.created_at >= v_day_start and w.created_at < v_row.started_at;

    insert into public.campaign_supports (campaign_id, wallet_code, amount, created_at, source)
    select v_row.id, public.wallet_code_of(f.username), sum(f.amount), max(f.created_at), 'engagement'
    from public.fan_logs f join public.users u on u.username = f.username
    where lower(f.member_name) = lower(v_member.name) and lower(u.role) = 'user'
      and f.created_at >= v_day_start and f.created_at < v_row.started_at
      and not exists (select 1 from public.wallet_logs w where w.action = 'Give Cookie' and w.wallet_code = public.wallet_code_of(f.username)
                      and w.created_at = f.created_at and lower(w.target) = lower(f.member_name))
    group by f.username having sum(f.amount) > 0;

    v_opened := v_opened || v_member.name;
  end loop;

  return jsonb_build_object('status', 'success', 'yearMonth', v_ym, 'opened', to_jsonb(v_opened));
end; $function$;

revoke all on function public.auto_open_birthday_campaigns(boolean) from public, anon, authenticated;

-- 00:01 and 00:31 Asia/Bangkok every day (= 17:01 / 17:31 UTC); the function itself only acts on day 1.
-- The second run is a retry in case the first is missed.
select cron.unschedule(jobid) from cron.job where jobname = 'auto-open-birthday-campaigns';
select cron.schedule('auto-open-birthday-campaigns', '1,31 17 * * *', 'select public.auto_open_birthday_campaigns();');
