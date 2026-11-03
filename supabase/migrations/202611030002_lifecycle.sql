-- Additive upgrade: existing records remain active; no stock or request history is reset.
alter table public.listings add column status text not null default 'active' check (status in ('active','closed'));
alter table public.needs add column status text not null default 'active' check (status in ('active','archived'));

create or replace function app_private.eligible(n public.needs, l public.listings) returns boolean
language sql stable set search_path = '' as $$
  select n.status = 'active' and l.status = 'active' and n.material_type = l.material_type and n.thickness_mm = l.thickness_mm
    and l.thickness_mm is not null
    and ((l.width_mm >= n.width_mm and l.height_mm >= n.height_mm)
      or (l.width_mm >= n.height_mm and l.height_mm >= n.width_mm))
    and app_private.normalize_region(n.region) = app_private.normalize_region(l.region)
    and n.needed_by >= (now() at time zone 'Europe/Istanbul')::date
    and l.pickup_deadline >= (now() at time zone 'Europe/Istanbul')::date
$$;

create or replace function public.app_command(p_action text, p_payload jsonb default '{}'::jsonb) returns jsonb
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
  if p_action in ('update_listing','close_listing') then
    if actor_role <> 'business' then return app_private.failure('FORBIDDEN','İşletme hesabı gerekli.'); end if;
    select * into l from public.listings where id = (p_payload->>'listingId')::uuid and business_id = actor for update;
    if not found then return app_private.failure('NOT_FOUND','İlan bulunamadı.'); end if;
    perform app_private.expire_listing(l.id);
    select * into l from public.listings where id = l.id;
    if p_action = 'close_listing' then
      if l.quantity_reserved > 0 or exists (select 1 from public.requests where listing_id = l.id and status in ('pending','approved')) then
        return app_private.failure('CONFLICT','Önce açık talepleri sonuçlandırın.');
      end if;
      update public.listings set status = 'closed' where id = l.id returning * into l;
    else
      if l.status <> 'active' or l.quantity_reserved > 0 or exists (select 1 from public.requests where listing_id = l.id) then
        return app_private.failure('CONFLICT','Kapalı veya işlem geçmişi bulunan ilan düzenlenemez. Yeni ilan oluşturun.');
      end if;
      if (p_payload->>'quantityOnHand')::numeric <> trunc((p_payload->>'quantityOnHand')::numeric)
        or (p_payload->>'quantityOnHand')::numeric <= 0 or (p_payload->>'pickupDeadline')::date < today then
        return app_private.failure('VALIDATION','Adet ve son teslim tarihi geçersiz.');
      end if;
      update public.listings set title=trim(p_payload->>'title'),material_type=p_payload->>'materialType',
        width_mm=(p_payload->>'widthMm')::numeric,height_mm=(p_payload->>'heightMm')::numeric,
        thickness_mm=(p_payload->>'thicknessMm')::numeric,quantity_on_hand=(p_payload->>'quantityOnHand')::integer,
        region=trim(p_payload->>'region'),pickup_deadline=(p_payload->>'pickupDeadline')::date
      where id=l.id returning * into l;
    end if;
    return app_private.success(to_jsonb(l));
  elsif p_action in ('update_need','archive_need') then
    if actor_role <> 'student' then return app_private.failure('FORBIDDEN','Öğrenci hesabı gerekli.'); end if;
    -- Same order as create_request: need, then listing, then request.
    select * into n from public.needs where id = (p_payload->>'needId')::uuid and student_id = actor for update;
    if not found then return app_private.failure('NOT_FOUND','İhtiyaç bulunamadı.'); end if;
    if p_action = 'archive_need' then
      for target in select distinct listing_id from public.requests where need_id = n.id and status = 'approved' order by listing_id loop
        perform app_private.expire_listing(target);
      end loop;
      if exists (select 1 from public.requests where need_id = n.id and status in ('pending','approved')) then
        return app_private.failure('CONFLICT','Önce açık talebi sonuçlandırın.');
      end if;
      update public.needs set status = 'archived' where id = n.id returning * into n;
    else
      if n.status <> 'active' or exists (select 1 from public.requests where need_id = n.id) then
        return app_private.failure('CONFLICT','Arşivlenmiş veya işlem geçmişi bulunan ihtiyaç düzenlenemez. Yeni ihtiyaç oluşturun.');
      end if;
      if (p_payload->>'quantity')::numeric <> trunc((p_payload->>'quantity')::numeric) or (p_payload->>'neededBy')::date < today then
        return app_private.failure('VALIDATION','Adet ve ihtiyaç tarihi geçersiz.');
      end if;
      update public.needs set project_name=trim(p_payload->>'projectName'),material_type=p_payload->>'materialType',
        width_mm=(p_payload->>'widthMm')::numeric,height_mm=(p_payload->>'heightMm')::numeric,
        thickness_mm=(p_payload->>'thicknessMm')::numeric,quantity=(p_payload->>'quantity')::integer,
        region=trim(p_payload->>'region'),needed_by=(p_payload->>'neededBy')::date
      where id=n.id returning * into n;
    end if;
    return app_private.success(to_jsonb(n));
  end if;
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
