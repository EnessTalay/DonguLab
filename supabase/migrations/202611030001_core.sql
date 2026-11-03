-- Fresh Supabase project. All client writes go through app_command; no direct DML.
create schema if not exists app_private;
revoke all on schema app_private from public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('student','business')),
  display_name text not null check (length(trim(display_name)) between 1 and 120)
);
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.profiles(id),
  title text not null check (length(trim(title)) between 1 and 200),
  material_type text not null check (material_type in ('wood','metal','plastic')),
  width_mm numeric not null check (width_mm > 0 and width_mm < 1000000000),
  height_mm numeric not null check (height_mm > 0 and height_mm < 1000000000),
  thickness_mm numeric check (thickness_mm > 0 and thickness_mm < 1000000000),
  quantity_on_hand integer not null check (quantity_on_hand >= 0),
  quantity_reserved integer not null default 0 check (quantity_reserved >= 0 and quantity_reserved <= quantity_on_hand),
  region text not null check (length(trim(region)) between 1 and 120),
  pickup_deadline date not null check (isfinite(pickup_deadline)),
  created_at timestamptz not null default now()
);
create table public.needs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id),
  project_name text not null check (length(trim(project_name)) between 1 and 200),
  material_type text not null check (material_type in ('wood','metal','plastic')),
  width_mm numeric not null check (width_mm > 0 and width_mm < 1000000000),
  height_mm numeric not null check (height_mm > 0 and height_mm < 1000000000),
  thickness_mm numeric not null check (thickness_mm > 0 and thickness_mm < 1000000000),
  quantity integer not null check (quantity > 0),
  region text not null check (length(trim(region)) between 1 and 120),
  needed_by date not null check (isfinite(needed_by)),
  created_at timestamptz not null default now()
);
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.needs(id),
  listing_id uuid not null references public.listings(id),
  student_id uuid not null references public.profiles(id),
  quantity integer not null check (quantity > 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled','delivered')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (status <> 'approved' or expires_at is not null)
);
create unique index one_active_or_completed_request_per_need on public.requests(need_id)
  where status in ('pending','approved','delivered');
create index requests_listing_idx on public.requests(listing_id);
create index requests_student_idx on public.requests(student_id);
create index requests_expiry_idx on public.requests(expires_at) where status = 'approved';
create index needs_student_idx on public.needs(student_id);
create index listings_business_idx on public.listings(business_id);
create table public.deliveries (
  request_id uuid primary key references public.requests(id),
  code_hash bytea,
  failed_attempts integer not null default 0 check (failed_attempts between 0 and 5),
  issue_count integer not null default 0 check (issue_count between 0 and 10),
  delivered_at timestamptz
);

create function app_private.actor_role() returns text language sql stable security definer
set search_path = '' as $$ select role from public.profiles where id = auth.uid() $$;
create function app_private.create_profile() returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  -- User-supplied metadata never grants a business role.
  insert into public.profiles(id, display_name) values(new.id, 'Yeni kullanıcı');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function app_private.create_profile();
-- Existing Auth accounts in a project also receive an unprivileged profile.
insert into public.profiles(id, display_name)
select id, 'Yeni kullanıcı' from auth.users on conflict do nothing;

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.needs enable row level security;
alter table public.requests enable row level security;
alter table public.deliveries enable row level security;
create policy profile_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy listing_read on public.listings for select to authenticated using ((select auth.uid()) is not null);
create policy request_read on public.requests for select to authenticated using (
  student_id = (select auth.uid()) or exists (
    select 1 from public.listings l where l.id = listing_id and l.business_id = (select auth.uid())
  )
);
create policy need_read on public.needs for select to authenticated using (
  student_id = (select auth.uid()) or exists (
    select 1 from public.requests r join public.listings l on l.id = r.listing_id
    where r.need_id = needs.id and l.business_id = (select auth.uid())
  )
);
revoke all on public.profiles, public.listings, public.needs, public.requests, public.deliveries from anon, authenticated;
grant select on public.profiles, public.listings, public.needs, public.requests to authenticated;

create function app_private.failure(code text, message text) returns jsonb language sql immutable
set search_path = '' as $$ select jsonb_build_object('ok', false, 'error', jsonb_build_object('code',code,'message',message)) $$;
create function app_private.success(data jsonb) returns jsonb language sql immutable
set search_path = '' as $$ select jsonb_build_object('ok',true,'data',data) $$;
create function app_private.normalize_region(value text) returns text language sql immutable
set search_path = '' as $$
  select lower(translate(regexp_replace(trim(value), '\s+', ' ', 'g'), 'Iİ', 'ıi'))
$$;
create function app_private.eligible(n public.needs, l public.listings) returns boolean
language sql stable set search_path = '' as $$
  select n.material_type = l.material_type and n.thickness_mm = l.thickness_mm
    and l.thickness_mm is not null
    and ((l.width_mm >= n.width_mm and l.height_mm >= n.height_mm)
      or (l.width_mm >= n.height_mm and l.height_mm >= n.width_mm))
    and app_private.normalize_region(n.region) = app_private.normalize_region(l.region)
    and n.needed_by >= (now() at time zone 'Europe/Istanbul')::date
    and l.pickup_deadline >= (now() at time zone 'Europe/Istanbul')::date
$$;

-- Every stock mutation locks listing FIRST, then requests. Never reverse this order.
create function app_private.expire_listing(target uuid) returns void language plpgsql security definer
set search_path = '' as $$
declare item public.requests;
begin
  perform 1 from public.listings where id = target for update;
  for item in select * from public.requests where listing_id = target and status = 'approved'
      and expires_at <= now() order by id for update loop
    update public.listings set quantity_reserved = quantity_reserved - item.quantity where id = target;
    update public.requests set status = 'cancelled' where id = item.id;
    update public.deliveries set code_hash = null where request_id = item.id;
  end loop;
end $$;
create function public.refresh_reservations() returns void language plpgsql security definer
set search_path = '' as $$
declare target uuid;
begin
  for target in select l.id from public.listings l where exists (
    select 1 from public.requests r where r.listing_id = l.id and r.status = 'approved' and r.expires_at <= now()
  ) order by l.id for update of l skip locked loop
    perform app_private.expire_listing(target);
  end loop;
end $$;

create function public.app_command(p_action text, p_payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid(); actor_role text;
  l public.listings; n public.needs; r public.requests; d public.deliveries;
  target uuid; raw_code text; deadline timestamptz;
  today date := (now() at time zone 'Europe/Istanbul')::date;
begin
  if actor is null then return app_private.failure('UNAUTHENTICATED','Önce giriş yapın.'); end if;
  actor_role := app_private.actor_role();
  if actor_role is null then return app_private.failure('FORBIDDEN','Kullanıcı profili bulunamadı.'); end if;
  if p_action = 'create_listing' then
    if actor_role <> 'business' then return app_private.failure('FORBIDDEN','İşletme hesabı gerekli.'); end if;
    if (p_payload->>'quantityOnHand')::numeric <> trunc((p_payload->>'quantityOnHand')::numeric)
      or (p_payload->>'quantityOnHand')::numeric <= 0 or (p_payload->>'pickupDeadline')::date < today then
      return app_private.failure('VALIDATION','Adet ve son teslim tarihi geçersiz.');
    end if;
    insert into public.listings(business_id,title,material_type,width_mm,height_mm,thickness_mm,quantity_on_hand,region,pickup_deadline)
    values(actor,trim(p_payload->>'title'),p_payload->>'materialType',(p_payload->>'widthMm')::numeric,
      (p_payload->>'heightMm')::numeric,(p_payload->>'thicknessMm')::numeric,
      (p_payload->>'quantityOnHand')::integer,trim(p_payload->>'region'),(p_payload->>'pickupDeadline')::date) returning * into l;
    return app_private.success(to_jsonb(l));
  elsif p_action = 'create_need' then
    if actor_role <> 'student' then return app_private.failure('FORBIDDEN','Öğrenci hesabı gerekli.'); end if;
    if (p_payload->>'quantity')::numeric <> trunc((p_payload->>'quantity')::numeric)
      or (p_payload->>'neededBy')::date < today then
      return app_private.failure('VALIDATION','Adet ve ihtiyaç tarihi geçersiz.');
    end if;
    insert into public.needs(student_id,project_name,material_type,width_mm,height_mm,thickness_mm,quantity,region,needed_by)
    values(actor,trim(p_payload->>'projectName'),p_payload->>'materialType',(p_payload->>'widthMm')::numeric,
      (p_payload->>'heightMm')::numeric,(p_payload->>'thicknessMm')::numeric,
      (p_payload->>'quantity')::integer,trim(p_payload->>'region'),(p_payload->>'neededBy')::date) returning * into n;
    return app_private.success(to_jsonb(n));
  elsif p_action = 'create_request' then
    if actor_role <> 'student' then return app_private.failure('FORBIDDEN','Öğrenci hesabı gerekli.'); end if;
    select * into n from public.needs where id = (p_payload->>'needId')::uuid and student_id = actor for update;
    if not found then return app_private.failure('NOT_FOUND','İhtiyaç bulunamadı.'); end if;
    select * into l from public.listings where id = (p_payload->>'listingId')::uuid for update;
    if not found then return app_private.failure('NOT_FOUND','İlan bulunamadı.'); end if;
    perform app_private.expire_listing(l.id);
    select * into r from public.requests where need_id = n.id and status in ('pending','approved','delivered');
    if found then
      if r.listing_id = l.id then return app_private.success(to_jsonb(r)); end if;
      return app_private.failure('CONFLICT','Bu ihtiyaç için zaten bir talep var.');
    end if;
    select * into l from public.listings where id = l.id;
    if not coalesce(app_private.eligible(n,l),false) then return app_private.failure('INCOMPATIBLE','İlan ihtiyaca uygun değil.'); end if;
    if l.quantity_on_hand - l.quantity_reserved < n.quantity then return app_private.failure('OUT_OF_STOCK','Yeterli stok yok.'); end if;
    insert into public.requests(need_id,listing_id,student_id,quantity) values(n.id,l.id,actor,n.quantity) returning * into r;
    return app_private.success(to_jsonb(r));
  end if;

  -- Authorize before locking another account's data or exposing its state.
  select * into r from public.requests where id = (p_payload->>'requestId')::uuid;
  if not found then return app_private.failure('NOT_FOUND','Talep bulunamadı.'); end if;
  select * into l from public.listings where id = r.listing_id;
  if p_action in ('approve_request','reject_request','confirm_delivery') then
    if actor_role <> 'business' or l.business_id <> actor then return app_private.failure('FORBIDDEN','Bu talep size ait değil.'); end if;
  elsif p_action in ('cancel_request','issue_delivery_code') then
    if actor_role <> 'student' or r.student_id <> actor then return app_private.failure('FORBIDDEN','Bu talep size ait değil.'); end if;
  else return app_private.failure('VALIDATION','Bilinmeyen işlem.'); end if;
  perform app_private.expire_listing(l.id);
  select * into l from public.listings where id = l.id for update;
  select * into r from public.requests where id = r.id for update;
  select * into n from public.needs where id = r.need_id;

  if p_action = 'approve_request' then
    if r.status in ('approved','delivered') then return app_private.success(to_jsonb(r)); end if;
    if r.status <> 'pending' then return app_private.failure('CONFLICT','Talep onaylanamaz.'); end if;
    if not coalesce(app_private.eligible(n,l),false) then return app_private.failure('INCOMPATIBLE','İlan artık ihtiyaca uygun değil.'); end if;
    if l.quantity_on_hand - l.quantity_reserved < r.quantity then return app_private.failure('OUT_OF_STOCK','Yeterli stok yok.'); end if;
    deadline := least(now() + interval '2 hours', ((l.pickup_deadline+1)::timestamp at time zone 'Europe/Istanbul') - interval '1 millisecond',
      ((n.needed_by+1)::timestamp at time zone 'Europe/Istanbul') - interval '1 millisecond');
    update public.listings set quantity_reserved = quantity_reserved + r.quantity where id = l.id;
    update public.requests set status = 'approved', expires_at = deadline where id = r.id returning * into r;
    insert into public.deliveries(request_id) values(r.id) on conflict do nothing;
  elsif p_action = 'reject_request' then
    if r.status = 'rejected' then return app_private.success(to_jsonb(r)); end if;
    if r.status <> 'pending' then return app_private.failure('CONFLICT','Yalnız bekleyen talep reddedilebilir.'); end if;
    update public.requests set status = 'rejected' where id = r.id returning * into r;
  elsif p_action = 'cancel_request' then
    if r.status = 'cancelled' then return app_private.success(to_jsonb(r)); end if;
    if r.status not in ('pending','approved') then return app_private.failure('CONFLICT','Talep iptal edilemez.'); end if;
    if r.status = 'approved' then update public.listings set quantity_reserved = quantity_reserved - r.quantity where id = l.id; end if;
    update public.requests set status = 'cancelled' where id = r.id returning * into r;
    update public.deliveries set code_hash = null where request_id = r.id;
  elsif p_action in ('issue_delivery_code','confirm_delivery') then
    if p_action = 'confirm_delivery' and r.status = 'delivered' then return app_private.success(to_jsonb(r)); end if;
    if r.status <> 'approved' then return app_private.failure('CONFLICT','Talep aktif bir onay taşımıyor.'); end if;
    select * into d from public.deliveries where request_id = r.id for update;
    if d.failed_attempts >= 5 then return app_private.failure('TOO_MANY_ATTEMPTS','Kod deneme sınırına ulaşıldı.'); end if;
    if p_action = 'issue_delivery_code' then
      if d.issue_count >= 10 then return app_private.failure('TOO_MANY_ATTEMPTS','Kod üretim sınırına ulaşıldı.'); end if;
      loop
        raw_code := lpad(((('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint) % 1000000)::text,6,'0');
        exit when d.code_hash is null or d.code_hash <> sha256(convert_to(r.id::text || ':' || raw_code,'UTF8'));
      end loop;
      update public.deliveries set code_hash = sha256(convert_to(r.id::text || ':' || raw_code,'UTF8')), issue_count = issue_count + 1 where request_id = r.id;
      return app_private.success(jsonb_build_object('code',raw_code,'expiresAt',r.expires_at));
    end if;
    raw_code := p_payload->>'code';
    if raw_code is null or raw_code !~ '^[0-9]{6}$' or d.code_hash is null or
      d.code_hash <> sha256(convert_to(r.id::text || ':' || raw_code,'UTF8')) then
      update public.deliveries set failed_attempts = failed_attempts + 1 where request_id = r.id;
      -- Return an error value, not an exception: attempts MUST survive commit.
      return app_private.failure('INVALID_CODE','Teslim kodu yanlış.');
    end if;
    update public.listings set quantity_on_hand = quantity_on_hand - r.quantity,
      quantity_reserved = quantity_reserved - r.quantity where id = l.id;
    update public.requests set status = 'delivered' where id = r.id returning * into r;
    update public.deliveries set code_hash = null, delivered_at = now() where request_id = r.id;
  end if;
  return app_private.success(to_jsonb(r));
exception
  when check_violation or not_null_violation or invalid_text_representation or
    numeric_value_out_of_range or datetime_field_overflow or invalid_datetime_format then
    return app_private.failure('VALIDATION','Gönderilen alanları kontrol edin.');
  when unique_violation then return app_private.failure('CONFLICT','Bu işlem zaten kaydedilmiş.');
  when foreign_key_violation then return app_private.failure('NOT_FOUND','İlişkili kayıt bulunamadı.');
end $$;

-- Bound to auth.uid(), not caller-supplied IDs. No code/hash in this DTO.
create function public.list_request_views(p_side text) returns jsonb language plpgsql security definer
set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null then return app_private.failure('UNAUTHENTICATED','Önce giriş yapın.'); end if;
  if p_side not in ('student','business') or app_private.actor_role() is distinct from p_side then
    return app_private.failure('FORBIDDEN','Bu liste için yetkiniz yok.');
  end if;
  perform public.refresh_reservations();
  select coalesce(jsonb_agg(jsonb_build_object('request',to_jsonb(r),'listingTitle',l.title,
    'projectName',n.project_name,'expiresAt',r.expires_at) order by r.created_at desc,r.id),'[]'::jsonb)
  into result from public.requests r join public.listings l on l.id=r.listing_id join public.needs n on n.id=r.need_id
  where (p_side='student' and r.student_id=auth.uid()) or (p_side='business' and l.business_id=auth.uid());
  return app_private.success(result);
end $$;

revoke all on all functions in schema app_private from public, anon, authenticated;
revoke all on function public.app_command(text,jsonb), public.list_request_views(text), public.refresh_reservations() from public, anon, authenticated;
grant execute on function public.app_command(text,jsonb), public.list_request_views(text), public.refresh_reservations() to authenticated;
grant execute on function public.refresh_reservations() to service_role;
