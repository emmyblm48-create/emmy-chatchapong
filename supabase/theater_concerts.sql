-- 🎭 Theaters & Concerts (2026-10-21)
-- iAM48-style booking: event -> round (Normal = random seat after close / Express = instant seat)
-- -> zone + quantity -> pay with Tokens only -> My Bookings -> Show Ticket.
-- Unlike the Shop, a ticket also unlocks the watch link (YouTube / Roblox) and its zone's reward
-- bundle (items/cookies/GE Token, same reward shape as shop_order_items.rewards) + a ticket-stub keepsake.

create table if not exists public.theater_events (
  id bigserial primary key,
  title text not null,
  cover_url text,
  event_date date not null,
  start_time time,
  end_time time,
  platform text not null default 'youtube' check (platform in ('youtube','roblox','onsite','other')),
  venue text,
  watch_url text,
  watch_note text,
  description text,
  member_ids text[] not null default '{}',
  max_per_user int not null default 2 check (max_per_user between 1 and 10),
  status text not null default 'draft' check (status in ('draft','published','cancelled')),
  cancel_reason text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.theater_rounds (
  id bigserial primary key,
  event_id bigint not null references public.theater_events(id) on delete cascade,
  kind text not null check (kind in ('normal','express')),
  open_at timestamptz not null,
  close_at timestamptz not null,
  draw_done boolean not null default false
);
create index if not exists theater_rounds_event_idx on public.theater_rounds(event_id);

create table if not exists public.theater_zones (
  id bigserial primary key,
  event_id bigint not null references public.theater_events(id) on delete cascade,
  name text not null,
  note text,
  price_tokens numeric not null check (price_tokens >= 0),
  capacity int not null check (capacity > 0),
  seat_prefix text not null default 'A',
  rewards jsonb not null default '[]'::jsonb,
  sort_order int not null default 0
);
create index if not exists theater_zones_event_idx on public.theater_zones(event_id);

create table if not exists public.theater_bookings (
  id bigserial primary key,
  booking_no text not null unique,
  event_id bigint not null references public.theater_events(id),
  round_id bigint not null references public.theater_rounds(id),
  zone_id bigint not null references public.theater_zones(id),
  wallet_code text not null references public.user_wallets(wallet_code) on update cascade,
  quantity int not null check (quantity > 0),
  unit_price numeric not null,
  total_tokens numeric not null,
  status text not null default 'paid' check (status in ('paid','cancelled')),
  rewards jsonb not null default '[]'::jsonb,
  rewards_redeemed_at timestamptz,
  cancel_reason text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists theater_bookings_wallet_idx on public.theater_bookings(wallet_code);
create index if not exists theater_bookings_event_idx on public.theater_bookings(event_id);

create table if not exists public.theater_tickets (
  id bigserial primary key,
  booking_id bigint not null references public.theater_bookings(id) on delete cascade,
  idx int not null,
  zone_id bigint not null references public.theater_zones(id),
  seat_no int,
  ticket_code text not null unique default upper(encode(extensions.gen_random_bytes(8), 'hex')),
  unique (zone_id, seat_no)
);
create index if not exists theater_tickets_booking_idx on public.theater_tickets(booking_id);

alter table public.theater_events enable row level security;
alter table public.theater_rounds enable row level security;
alter table public.theater_zones enable row level security;
alter table public.theater_bookings enable row level security;
alter table public.theater_tickets enable row level security;
-- RLS on + zero policies, reachable only through the SECURITY DEFINER RPCs below
grant all on public.theater_events, public.theater_rounds, public.theater_zones,
             public.theater_bookings, public.theater_tickets to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------------------------------------------------------------- helpers

create or replace function public.theater_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Bangkok')::date $$;

-- seats left in a zone = capacity - seats in paid bookings
create or replace function public.theater_zone_left(p_zone_id bigint) returns int
language sql stable security definer set search_path to 'public' as $$
  select z.capacity - coalesce((select sum(b.quantity) from public.theater_bookings b
                                 where b.zone_id = z.id and b.status = 'paid'), 0)::int
  from public.theater_zones z where z.id = p_zone_id
$$;

-- give every ticket without a seat a random free seat in its zone
create or replace function public.theater_fill_seats(p_ticket_ids bigint[]) returns void
language plpgsql security definer set search_path to 'public' as $$
declare
  v_zone record;
begin
  for v_zone in
    select distinct z.id, z.capacity from public.theater_tickets t
      join public.theater_zones z on z.id = t.zone_id
     where t.id = any(p_ticket_ids) and t.seat_no is null
  loop
    perform 1 from public.theater_zones where id = v_zone.id for update;
    with free as (
      select s, row_number() over (order by random()) rn
        from generate_series(1, v_zone.capacity) s
       where not exists (select 1 from public.theater_tickets x where x.zone_id = v_zone.id and x.seat_no = s)
    ), todo as (
      select t.id, row_number() over (order by random()) rn
        from public.theater_tickets t
       where t.id = any(p_ticket_ids) and t.zone_id = v_zone.id and t.seat_no is null
    )
    update public.theater_tickets t set seat_no = free.s
      from todo join free on free.rn = todo.rn
     where t.id = todo.id;
  end loop;
end;
$$;

-- Normal round: seats are drawn at random once the round has closed (runs lazily on read)
create or replace function public.theater_draw_due(p_event_id bigint default null) returns void
language plpgsql security definer set search_path to 'public' as $$
declare
  v_round record;
  v_ids bigint[];
begin
  for v_round in
    select r.* from public.theater_rounds r
     where r.kind = 'normal' and not r.draw_done and r.close_at <= now()
       and (p_event_id is null or r.event_id = p_event_id)
     for update skip locked
  loop
    select array_agg(t.id) into v_ids
      from public.theater_tickets t join public.theater_bookings b on b.id = t.booking_id
     where b.round_id = v_round.id and b.status = 'paid' and t.seat_no is null;
    if v_ids is not null then
      perform public.theater_fill_seats(v_ids);
    end if;
    update public.theater_rounds set draw_done = true where id = v_round.id;
  end loop;
end;
$$;

create or replace function public.theater_seat_label(p_prefix text, p_seat int) returns text
language sql immutable as $$ select case when p_seat is null then null else coalesce(p_prefix,'') || p_seat end $$;

-- round state for the list/detail pages
create or replace function public.theater_round_json(r public.theater_rounds) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'id', r.id, 'kind', r.kind, 'openAt', r.open_at, 'closeAt', r.close_at,
    'state', case when now() < r.open_at then 'upcoming' when now() < r.close_at then 'open' else 'closed' end)
$$;

-- ---------------------------------------------------------------- user RPCs

create or replace function public.get_theater_events(p_username text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  v_wc text := public.wallet_code_of(p_username);
begin
  return jsonb_build_object('status','success',
    'myBookings', (select count(*) from public.theater_bookings b join public.theater_events e on e.id = b.event_id
                    where b.wallet_code = v_wc and b.status = 'paid' and e.event_date >= public.theater_today()),
    'events', coalesce((
      select jsonb_agg(x order by x->>'eventDate', x->>'startTime', (x->>'id')::bigint) from (
        select jsonb_build_object(
          'id', e.id, 'title', e.title, 'coverUrl', e.cover_url, 'eventDate', e.event_date,
          'startTime', to_char(e.start_time,'HH24:MI'), 'endTime', to_char(e.end_time,'HH24:MI'),
          'platform', e.platform, 'venue', e.venue,
          'minPrice', (select min(price_tokens) from public.theater_zones z where z.event_id = e.id),
          'seatsLeft', (select coalesce(sum(public.theater_zone_left(z.id)),0) from public.theater_zones z where z.event_id = e.id),
          'rounds', coalesce((select jsonb_agg(public.theater_round_json(r) order by r.open_at)
                                from public.theater_rounds r where r.event_id = e.id), '[]'::jsonb),
          'myBookingId', (select b.id from public.theater_bookings b where b.event_id = e.id
                            and b.wallet_code = v_wc and b.status = 'paid' limit 1)
        ) x
        from public.theater_events e
        where e.status = 'published' and e.event_date >= public.theater_today()
      ) s), '[]'::jsonb));
end;
$$;

create or replace function public.get_theater_event(p_username text, p_event_id bigint) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  v_e public.theater_events;
  v_wc text := public.wallet_code_of(p_username);
begin
  select * into v_e from public.theater_events where id = p_event_id and status <> 'draft';
  if not found then
    return jsonb_build_object('status','fail','message','ไม่พบการแสดงนี้ค่ะ');
  end if;
  return jsonb_build_object('status','success','event', jsonb_build_object(
    'id', v_e.id, 'title', v_e.title, 'coverUrl', v_e.cover_url, 'eventDate', v_e.event_date,
    'startTime', to_char(v_e.start_time,'HH24:MI'), 'endTime', to_char(v_e.end_time,'HH24:MI'),
    'platform', v_e.platform, 'venue', v_e.venue, 'description', v_e.description,
    'maxPerUser', v_e.max_per_user, 'status', v_e.status, 'cancelReason', v_e.cancel_reason,
    'isPast', v_e.event_date < public.theater_today(),
    'rounds', coalesce((select jsonb_agg(public.theater_round_json(r) order by r.open_at)
                          from public.theater_rounds r where r.event_id = v_e.id), '[]'::jsonb),
    'zones', coalesce((select jsonb_agg(jsonb_build_object(
                 'id', z.id, 'name', z.name, 'note', z.note, 'price', z.price_tokens,
                 'capacity', z.capacity, 'left', public.theater_zone_left(z.id), 'rewards', z.rewards)
                 order by z.sort_order, z.id)
               from public.theater_zones z where z.event_id = v_e.id), '[]'::jsonb),
    'members', coalesce((select jsonb_agg(jsonb_build_object(
                 'id', m.member_id, 'name', m.name, 'fullName', m.full_name_en,
                 'img', m.profile_img, 'group', m.group_name) order by upper(m.name))
               from public.members m where m.member_id = any(v_e.member_ids)), '[]'::jsonb),
    'myBookingId', (select b.id from public.theater_bookings b where b.event_id = v_e.id
                      and b.wallet_code = v_wc and b.status = 'paid' limit 1)
  ));
end;
$$;

create or replace function public.theater_book(p_username text, p_round_id bigint, p_zone_id bigint, p_quantity int)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_user record;
  v_round public.theater_rounds;
  v_e public.theater_events;
  v_zone public.theater_zones;
  v_wc text := public.wallet_code_of(p_username);
  v_left int;
  v_total numeric;
  v_new_token numeric;
  v_booking_id bigint;
  v_rewards jsonb := '[]'::jsonb;
  v_row jsonb;
  v_ids bigint[];
  i int;
begin
  if p_username is null or v_wc is null then
    return jsonb_build_object('status','fail','message','ไม่พบบัญชีผู้ใช้ค่ะ');
  end if;
  select * into v_round from public.theater_rounds where id = p_round_id;
  if not found then return jsonb_build_object('status','fail','message','ไม่พบรอบการขายนี้ค่ะ'); end if;
  select * into v_e from public.theater_events where id = v_round.event_id;
  if v_e.status <> 'published' then
    return jsonb_build_object('status','fail','message','การแสดงนี้ไม่เปิดขายแล้วค่ะ');
  end if;
  if now() < v_round.open_at then
    return jsonb_build_object('status','fail','message','รอบนี้ยังไม่เปิดขายค่ะ');
  end if;
  if now() >= v_round.close_at then
    return jsonb_build_object('status','fail','message','รอบนี้ปิดการขายแล้วค่ะ (Booking Closed)');
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > v_e.max_per_user then
    return jsonb_build_object('status','fail','message','จำกัด ' || v_e.max_per_user || ' ที่นั่งต่อ 1 บัญชีค่ะ');
  end if;

  select * into v_zone from public.theater_zones where id = p_zone_id and event_id = v_e.id for update;
  if not found then return jsonb_build_object('status','fail','message','ไม่พบโซนที่นั่งนี้ค่ะ'); end if;

  select * into v_user from public.users where username = p_username for update;
  if v_user.status = 'suspended' then
    return jsonb_build_object('status','fail','message','บัญชีนี้ถูกระงับการใช้งานค่ะ');
  end if;
  if exists (select 1 from public.theater_bookings where event_id = v_e.id and wallet_code = v_wc and status = 'paid') then
    return jsonb_build_object('status','fail','message','คุณจองการแสดงนี้ไปแล้วค่ะ ดูได้ที่ My Bookings', 'code','already_booked');
  end if;

  v_left := public.theater_zone_left(v_zone.id);
  if v_left < p_quantity then
    return jsonb_build_object('status','fail','message',
      case when v_left <= 0 then 'โซนนี้ที่นั่งเต็มแล้วค่ะ (Sold Out)' else 'โซนนี้เหลือเพียง ' || v_left || ' ที่นั่งค่ะ' end);
  end if;

  v_total := v_zone.price_tokens * p_quantity;
  if coalesce(v_user.token,0) < v_total then
    return jsonb_build_object('status','fail','message','Token ไม่เพียงพอค่ะ ต้องใช้ ' || v_total || ' Tokens');
  end if;

  -- rewards per seat x quantity (items repeated, amounts multiplied)
  for v_row in select * from jsonb_array_elements(v_zone.rewards) loop
    if v_row->>'kind' = 'item' then
      for i in 1..p_quantity loop v_rewards := v_rewards || jsonb_build_array(v_row); end loop;
    else
      v_rewards := v_rewards || jsonb_build_array(v_row || jsonb_build_object('amount', coalesce((v_row->>'amount')::numeric,0) * p_quantity));
    end if;
  end loop;

  update public.users set token = token - v_total, updated_at = now()
   where username = p_username returning token into v_new_token;

  insert into public.theater_bookings (booking_no, event_id, round_id, zone_id, wallet_code, quantity, unit_price, total_tokens, rewards)
  values ('TT' || to_char(now() at time zone 'Asia/Bangkok','YYYY') || lpad(v_e.id::text, 4, '0') || '-'
            || upper(encode(extensions.gen_random_bytes(5),'hex')),
          v_e.id, v_round.id, v_zone.id, v_wc, p_quantity, v_zone.price_tokens, v_total, v_rewards)
  returning id into v_booking_id;

  insert into public.theater_tickets (booking_id, idx, zone_id)
  select v_booking_id, g, v_zone.id from generate_series(1, p_quantity) g;

  -- Express round = seat right away; Normal round waits for the draw after the round closes
  if v_round.kind = 'express' then
    select array_agg(id) into v_ids from public.theater_tickets where booking_id = v_booking_id;
    perform public.theater_fill_seats(v_ids);
  end if;

  insert into public.wallet_logs (wallet_code, action, target, amount)
    values (v_wc, 'Buy Ticket', v_e.title || ' - ' || v_zone.name || ' x' || p_quantity, v_total);

  return jsonb_build_object('status','success','bookingId', v_booking_id, 'newToken', v_new_token);
end;
$$;

-- shared booking JSON (list + detail)
create or replace function public.theater_booking_json(p_booking_id bigint, p_full boolean) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare
  b public.theater_bookings;
  e public.theater_events;
  z public.theater_zones;
  r public.theater_rounds;
  v_unseated int;
  v_issued boolean;
  v_tab text;
  v_j jsonb;
begin
  select * into b from public.theater_bookings where id = p_booking_id;
  select * into e from public.theater_events where id = b.event_id;
  select * into z from public.theater_zones where id = b.zone_id;
  select * into r from public.theater_rounds where id = b.round_id;
  select count(*) into v_unseated from public.theater_tickets where booking_id = b.id and seat_no is null;
  v_issued := b.status = 'paid' and v_unseated = 0;
  v_tab := case when b.status = 'cancelled' then 'cancelled'
                when e.event_date < public.theater_today() then 'past' else 'current' end;
  v_j := jsonb_build_object(
    'id', b.id, 'bookingNo', b.booking_no, 'status', b.status, 'tab', v_tab,
    'quantity', b.quantity, 'unitPrice', b.unit_price, 'total', b.total_tokens,
    'createdAt', b.created_at, 'cancelledAt', b.cancelled_at, 'cancelReason', b.cancel_reason,
    'roundKind', r.kind, 'seatDrawAt', case when r.kind = 'normal' then r.close_at end,
    'zoneName', z.name, 'ticketIssued', v_issued,
    'event', jsonb_build_object('id', e.id, 'title', e.title, 'coverUrl', e.cover_url,
       'eventDate', e.event_date, 'startTime', to_char(e.start_time,'HH24:MI'),
       'endTime', to_char(e.end_time,'HH24:MI'), 'platform', e.platform, 'venue', e.venue));
  if p_full then
    v_j := v_j || jsonb_build_object(
      'rewards', b.rewards, 'rewardsRedeemedAt', b.rewards_redeemed_at,
      'watchUrl', case when v_issued then e.watch_url end,
      'watchNote', case when v_issued then e.watch_note end,
      'tickets', case when v_issued then coalesce((select jsonb_agg(jsonb_build_object(
          'idx', t.idx, 'seat', public.theater_seat_label(z.seat_prefix, t.seat_no), 'code', t.ticket_code) order by t.idx)
          from public.theater_tickets t where t.booking_id = b.id), '[]'::jsonb) else '[]'::jsonb end);
  end if;
  return v_j;
end;
$$;

create or replace function public.get_my_theater_bookings(p_username text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  v_wc text := public.wallet_code_of(p_username);
begin
  perform public.theater_draw_due(null);
  return jsonb_build_object('status','success','bookings', coalesce((
    select jsonb_agg(public.theater_booking_json(b.id, false) order by e.event_date, b.id desc)
      from public.theater_bookings b join public.theater_events e on e.id = b.event_id
     where b.wallet_code = v_wc), '[]'::jsonb));
end;
$$;

create or replace function public.get_theater_booking(p_username text, p_booking_id bigint) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  v_event_id bigint;
begin
  select event_id into v_event_id from public.theater_bookings
   where id = p_booking_id and wallet_code = public.wallet_code_of(p_username);
  if not found then return jsonb_build_object('status','fail','message','ไม่พบการจองนี้ค่ะ'); end if;
  perform public.theater_draw_due(v_event_id);
  return jsonb_build_object('status','success','booking', public.theater_booking_json(p_booking_id, true));
end;
$$;

-- rewards + ticket-stub keepsake go to Inventory once the ticket (seat) is issued
create or replace function public.redeem_theater_rewards(p_username text, p_booking_id bigint) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  b public.theater_bookings;
  e public.theater_events;
  z public.theater_zones;
  v_wc text := public.wallet_code_of(p_username);
  v_row jsonb;
  v_amount numeric;
  v_t record;
begin
  perform public.theater_draw_due(null);
  select * into b from public.theater_bookings where id = p_booking_id and wallet_code = v_wc for update;
  if not found then return jsonb_build_object('status','fail','message','ไม่พบการจองนี้ค่ะ'); end if;
  if b.status <> 'paid' then return jsonb_build_object('status','fail','message','การจองนี้ถูกยกเลิกแล้วค่ะ'); end if;
  if b.rewards_redeemed_at is not null then return jsonb_build_object('status','fail','message','รับของรางวัลไปแล้วค่ะ'); end if;
  if exists (select 1 from public.theater_tickets where booking_id = b.id and seat_no is null) then
    return jsonb_build_object('status','fail','message','รอระบบสุ่มที่นั่งก่อน จึงจะรับของได้ค่ะ');
  end if;
  select * into e from public.theater_events where id = b.event_id;
  select * into z from public.theater_zones where id = b.zone_id;
  perform 1 from public.users where username = p_username for update;

  for v_row in select * from jsonb_array_elements(b.rewards) loop
    v_amount := coalesce((v_row->>'amount')::numeric, 0);
    if v_row->>'kind' = 'item' then
      insert into public.inventory (wallet_code, item_type, collection_id, item_name, image_url)
        values (v_wc, coalesce(nullif(v_row->>'itemType',''),'Merchandise Official'), coalesce(v_row->>'collectionId','theater_' || e.id),
                v_row->>'label', v_row->>'imageUrl');
    elsif v_row->>'kind' = 'cookie' and v_amount > 0 then
      update public.users set cookie = cookie + v_amount, updated_at = now() where username = p_username;
      insert into public.wallet_logs (wallet_code, action, target, amount) values (v_wc, 'Ticket Reward', e.title || ' (Cookie)', v_amount);
    elsif v_row->>'kind' = 'ge_token' and v_amount > 0 then
      update public.users set ge_token = ge_token + v_amount, updated_at = now() where username = p_username;
      insert into public.wallet_logs (wallet_code, action, target, amount) values (v_wc, 'Ticket Reward', e.title || ' (GE Token)', v_amount);
    end if;
  end loop;

  -- ticket stub keepsake, one per seat
  for v_t in select * from public.theater_tickets where booking_id = b.id order by idx loop
    insert into public.inventory (wallet_code, item_type, collection_id, item_name, image_url)
      values (v_wc, 'Ticket Stub', 'theater_' || e.id,
              e.title || ' · ' || to_char(e.event_date,'DD Mon YYYY') || ' · Seat ' || public.theater_seat_label(z.seat_prefix, v_t.seat_no),
              e.cover_url);
  end loop;

  update public.theater_bookings set rewards_redeemed_at = now() where id = b.id;
  return jsonb_build_object('status','success',
    'wallet', (select jsonb_build_object('token', token, 'cookie', cookie, 'geToken', ge_token) from public.users where username = p_username));
end;
$$;

-- ---------------------------------------------------------------- admin RPCs

create or replace function public.admin_list_theater_events(p_admin_username text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin_or_ceo(p_admin_username) then
    return jsonb_build_object('status','error','message','ไม่มีสิทธิ์ทำรายการนี้');
  end if;
  return jsonb_build_object('status','success','events', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', e.id, 'title', e.title, 'coverUrl', e.cover_url, 'eventDate', e.event_date,
      'startTime', to_char(e.start_time,'HH24:MI'), 'endTime', to_char(e.end_time,'HH24:MI'),
      'platform', e.platform, 'status', e.status,
      'capacity', (select coalesce(sum(capacity),0) from public.theater_zones z where z.event_id = e.id),
      'sold', (select coalesce(sum(quantity),0) from public.theater_bookings b where b.event_id = e.id and b.status = 'paid'),
      'revenue', (select coalesce(sum(total_tokens),0) from public.theater_bookings b where b.event_id = e.id and b.status = 'paid'))
      order by e.event_date desc, e.id desc)
    from public.theater_events e), '[]'::jsonb));
end;
$$;

create or replace function public.admin_get_theater_event(p_admin_username text, p_event_id bigint) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  e public.theater_events;
begin
  if not public.is_admin_or_ceo(p_admin_username) then
    return jsonb_build_object('status','error','message','ไม่มีสิทธิ์ทำรายการนี้');
  end if;
  perform public.theater_draw_due(p_event_id);
  select * into e from public.theater_events where id = p_event_id;
  if not found then return jsonb_build_object('status','error','message','ไม่พบการแสดงนี้'); end if;
  return jsonb_build_object('status','success','event', jsonb_build_object(
    'id', e.id, 'title', e.title, 'coverUrl', e.cover_url, 'eventDate', e.event_date,
    'startTime', to_char(e.start_time,'HH24:MI'), 'endTime', to_char(e.end_time,'HH24:MI'),
    'platform', e.platform, 'venue', e.venue, 'watchUrl', e.watch_url, 'watchNote', e.watch_note,
    'description', e.description, 'memberIds', to_jsonb(e.member_ids), 'maxPerUser', e.max_per_user,
    'status', e.status, 'cancelReason', e.cancel_reason,
    'rounds', coalesce((select jsonb_agg(public.theater_round_json(r) || jsonb_build_object('drawDone', r.draw_done) order by r.open_at)
                          from public.theater_rounds r where r.event_id = e.id), '[]'::jsonb),
    'zones', coalesce((select jsonb_agg(jsonb_build_object(
                 'id', z.id, 'name', z.name, 'note', z.note, 'price', z.price_tokens, 'capacity', z.capacity,
                 'seatPrefix', z.seat_prefix, 'rewards', z.rewards, 'left', public.theater_zone_left(z.id),
                 'hasBookings', exists (select 1 from public.theater_bookings b where b.zone_id = z.id))
                 order by z.sort_order, z.id)
               from public.theater_zones z where z.event_id = e.id), '[]'::jsonb),
    'bookings', coalesce((select jsonb_agg(jsonb_build_object(
                 'id', b.id, 'bookingNo', b.booking_no, 'username', w.username, 'name', u.name,
                 'zoneName', z.name, 'roundKind', r.kind, 'quantity', b.quantity, 'total', b.total_tokens,
                 'status', b.status, 'createdAt', b.created_at, 'redeemed', b.rewards_redeemed_at is not null,
                 'seats', (select jsonb_agg(public.theater_seat_label(z.seat_prefix, t.seat_no) order by t.idx)
                             from public.theater_tickets t where t.booking_id = b.id))
                 order by b.created_at desc)
               from public.theater_bookings b
               join public.theater_zones z on z.id = b.zone_id
               join public.theater_rounds r on r.id = b.round_id
               left join public.user_wallets w on w.wallet_code = b.wallet_code
               left join public.users u on u.username = w.username
              where b.event_id = e.id), '[]'::jsonb)
  ));
end;
$$;

-- create (p_event->>'id' null) or update an event incl. its rounds and zones
create or replace function public.admin_save_theater_event(p_admin_username text, p_event jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  v_id bigint := nullif(p_event->>'id','')::bigint;
  v_r jsonb;
  v_z jsonb;
  v_keep_rounds bigint[] := '{}';
  v_keep_zones bigint[] := '{}';
  v_rid bigint;
  v_zid bigint;
  v_sort int := 0;
begin
  if not public.is_admin_or_ceo(p_admin_username) then
    return jsonb_build_object('status','error','message','ไม่มีสิทธิ์ทำรายการนี้');
  end if;
  if coalesce(trim(p_event->>'title'),'') = '' or nullif(p_event->>'eventDate','') is null then
    return jsonb_build_object('status','error','message','กรุณากรอกชื่อการแสดงและวันที่แสดง');
  end if;
  if jsonb_array_length(coalesce(p_event->'zones','[]')) = 0 or jsonb_array_length(coalesce(p_event->'rounds','[]')) = 0 then
    return jsonb_build_object('status','error','message','ต้องมีอย่างน้อย 1 รอบขาย และ 1 โซนที่นั่ง');
  end if;
  if coalesce(p_event->>'status','draft') not in ('draft','published') then
    return jsonb_build_object('status','error','message','สถานะไม่ถูกต้อง');
  end if;

  if v_id is null then
    insert into public.theater_events (title, event_date, created_by)
      values (trim(p_event->>'title'), (p_event->>'eventDate')::date, p_admin_username) returning id into v_id;
  elsif not exists (select 1 from public.theater_events where id = v_id and status <> 'cancelled') then
    return jsonb_build_object('status','error','message','ไม่พบการแสดงนี้ หรือถูกยกเลิกไปแล้ว');
  end if;

  update public.theater_events set
    title = trim(p_event->>'title'),
    cover_url = nullif(trim(p_event->>'coverUrl'),''),
    event_date = (p_event->>'eventDate')::date,
    start_time = nullif(p_event->>'startTime','')::time,
    end_time = nullif(p_event->>'endTime','')::time,
    platform = coalesce(nullif(p_event->>'platform',''),'youtube'),
    venue = nullif(trim(p_event->>'venue'),''),
    watch_url = nullif(trim(p_event->>'watchUrl'),''),
    watch_note = nullif(trim(p_event->>'watchNote'),''),
    description = nullif(p_event->>'description',''),
    member_ids = coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_event->'memberIds','[]')) x), '{}'),
    max_per_user = coalesce(nullif(p_event->>'maxPerUser','')::int, 2),
    status = coalesce(p_event->>'status','draft'),
    updated_at = now()
  where id = v_id;

  for v_r in select * from jsonb_array_elements(p_event->'rounds') loop
    if (v_r->>'closeAt')::timestamptz <= (v_r->>'openAt')::timestamptz then
      raise exception 'เวลาปิดขายต้องหลังเวลาเปิดขาย';
    end if;
    v_rid := nullif(v_r->>'id','')::bigint;
    if v_rid is not null and exists (select 1 from public.theater_rounds where id = v_rid and event_id = v_id) then
      update public.theater_rounds set kind = v_r->>'kind', open_at = (v_r->>'openAt')::timestamptz,
             close_at = (v_r->>'closeAt')::timestamptz,
             draw_done = case when (v_r->>'closeAt')::timestamptz > now() then false else draw_done end
       where id = v_rid;
    else
      insert into public.theater_rounds (event_id, kind, open_at, close_at)
        values (v_id, v_r->>'kind', (v_r->>'openAt')::timestamptz, (v_r->>'closeAt')::timestamptz) returning id into v_rid;
    end if;
    v_keep_rounds := v_keep_rounds || v_rid;
  end loop;

  for v_z in select * from jsonb_array_elements(p_event->'zones') loop
    v_sort := v_sort + 1;
    v_zid := nullif(v_z->>'id','')::bigint;
    if v_zid is not null and exists (select 1 from public.theater_zones where id = v_zid and event_id = v_id) then
      if (v_z->>'capacity')::int < (select coalesce(sum(quantity),0) from public.theater_bookings where zone_id = v_zid and status = 'paid')
         or (v_z->>'capacity')::int < coalesce((select max(seat_no) from public.theater_tickets where zone_id = v_zid), 0) then
        raise exception 'โซน % มีคนจองมากกว่าจำนวนที่นั่งใหม่', v_z->>'name';
      end if;
      update public.theater_zones set name = trim(v_z->>'name'), note = nullif(trim(v_z->>'note'),''),
             price_tokens = (v_z->>'price')::numeric, capacity = (v_z->>'capacity')::int,
             seat_prefix = coalesce(nullif(trim(v_z->>'seatPrefix'),''),'A'),
             rewards = coalesce(v_z->'rewards','[]'), sort_order = v_sort
       where id = v_zid;
    else
      insert into public.theater_zones (event_id, name, note, price_tokens, capacity, seat_prefix, rewards, sort_order)
        values (v_id, trim(v_z->>'name'), nullif(trim(v_z->>'note'),''), (v_z->>'price')::numeric, (v_z->>'capacity')::int,
                coalesce(nullif(trim(v_z->>'seatPrefix'),''),'A'), coalesce(v_z->'rewards','[]'), v_sort)
        returning id into v_zid;
    end if;
    v_keep_zones := v_keep_zones || v_zid;
  end loop;

  if exists (select 1 from public.theater_bookings where event_id = v_id
              and (round_id <> all(v_keep_rounds) or zone_id <> all(v_keep_zones))) then
    raise exception 'ลบรอบหรือโซนที่มีคนจองแล้วไม่ได้';
  end if;
  delete from public.theater_rounds where event_id = v_id and id <> all(v_keep_rounds);
  delete from public.theater_zones where event_id = v_id and id <> all(v_keep_zones);

  return jsonb_build_object('status','success','id', v_id);
exception when others then
  return jsonb_build_object('status','error','message', sqlerrm);
end;
$$;

-- cancel the whole event and refund every paid booking
create or replace function public.admin_cancel_theater_event(p_admin_username text, p_event_id bigint, p_reason text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  e public.theater_events;
  b record;
  v_n int := 0;
  v_reason text := coalesce(nullif(trim(p_reason),''),'ผู้จัดยกเลิกการแสดง');
begin
  if not public.is_admin_or_ceo(p_admin_username) then
    return jsonb_build_object('status','error','message','ไม่มีสิทธิ์ทำรายการนี้');
  end if;
  select * into e from public.theater_events where id = p_event_id for update;
  if not found or e.status = 'cancelled' then
    return jsonb_build_object('status','error','message','ไม่พบการแสดง หรือถูกยกเลิกไปแล้ว');
  end if;
  for b in select tb.*, w.username from public.theater_bookings tb join public.user_wallets w on w.wallet_code = tb.wallet_code
            where tb.event_id = p_event_id and tb.status = 'paid' for update of tb loop
    -- rewards already redeemed stay with the fan; Tokens are refunded in full
    update public.users set token = token + b.total_tokens, updated_at = now() where username = b.username;
    insert into public.wallet_logs (wallet_code, action, target, amount)
      values (b.wallet_code, 'Ticket Refund', e.title || ' (' || v_reason || ')', b.total_tokens);
    update public.theater_bookings set status = 'cancelled', cancelled_at = now(), cancel_reason = v_reason where id = b.id;
    delete from public.theater_tickets where booking_id = b.id;
    v_n := v_n + 1;
  end loop;
  update public.theater_events set status = 'cancelled', cancel_reason = v_reason, updated_at = now() where id = p_event_id;
  return jsonb_build_object('status','success','refunded', v_n);
end;
$$;

-- delete an event that nobody has booked yet
create or replace function public.admin_delete_theater_event(p_admin_username text, p_event_id bigint) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin_or_ceo(p_admin_username) then
    return jsonb_build_object('status','error','message','ไม่มีสิทธิ์ทำรายการนี้');
  end if;
  if exists (select 1 from public.theater_bookings where event_id = p_event_id) then
    return jsonb_build_object('status','error','message','มีคนจองแล้ว ลบไม่ได้ ใช้ "ยกเลิกการแสดง" แทน');
  end if;
  delete from public.theater_events where id = p_event_id;
  return jsonb_build_object('status','success');
end;
$$;

-- internal helpers are not callable from the browser
revoke execute on function public.theater_fill_seats(bigint[]) from public, anon, authenticated;
revoke execute on function public.theater_draw_due(bigint) from public, anon, authenticated;
revoke execute on function public.theater_booking_json(bigint, boolean) from public, anon, authenticated;
revoke execute on function public.theater_zone_left(bigint) from public, anon, authenticated;

-- 2026-10-21 follow-up (migration theater_seatmap_url): optional seat-map image shown on the zone page
-- ('Seating area'); falls back to the poster. get_theater_event / admin_get_theater_event return
-- 'seatmapUrl', admin_save_theater_event writes p_event->>'seatmapUrl'.
alter table public.theater_events add column if not exists seatmap_url text;

-- 2026-10-21 follow-up (migration theater_holder_tickets): free "holder" tickets.
-- theater_events.holder_collections = inventory collection_ids; anyone owning one gets 1 free ticket
-- (source='holder', 0 Tokens, seat assigned immediately) via theater_grant_holder_tickets(p_username),
-- which runs at the top of get_theater_events / get_theater_event / get_my_theater_bookings.
-- Unique index theater_bookings_one_paid = one paid booking per (event, wallet).
-- Event 3 = Concert 2026 - This Letter Says "Marry Me" (26 Sep 2026, Roblox), holders of
-- preorder_ssr / preorder_premium / preorder_standard; 50 tickets backfilled on 2026-10-21.
alter table public.theater_events add column if not exists holder_collections text[] not null default '{}';
alter table public.theater_bookings add column if not exists source text not null default 'purchase' check (source in ('purchase','holder'));
create unique index if not exists theater_bookings_one_paid on public.theater_bookings(event_id, wallet_code) where status = 'paid';
