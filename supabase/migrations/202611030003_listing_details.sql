alter table public.listings
  add column description text not null default '',
  add column pickup_instructions text not null default '';

alter table public.listings
  add constraint listings_description_length
    check (length(description) <= 2000),
  add constraint listings_pickup_instructions_length
    check (length(pickup_instructions) <= 1000);

create function public.listing_details_command(
  p_action text,
  p_payload jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = '' as $$
declare
  actor uuid := auth.uid();
  actor_role text;
  result jsonb;
  listing_id uuid;
  description_value text := coalesce(p_payload->>'description', '');
  instructions_value text := coalesce(p_payload->>'pickupInstructions', '');
  listing_row public.listings;
begin
  if actor is null then
    return app_private.failure('UNAUTHENTICATED', 'Önce giriş yapın.');
  end if;
  actor_role := app_private.actor_role();
  if actor_role is distinct from 'business' then
    return app_private.failure('FORBIDDEN', 'İşletme hesabı gerekli.');
  end if;
  if p_action not in ('create_listing', 'update_listing') then
    return app_private.failure('VALIDATION', 'Bilinmeyen ilan işlemi.');
  end if;
  if (p_payload ? 'description' and jsonb_typeof(p_payload->'description') <> 'string')
    or (p_payload ? 'pickupInstructions' and jsonb_typeof(p_payload->'pickupInstructions') <> 'string')
    or length(description_value) > 2000
    or length(instructions_value) > 1000 then
    return app_private.failure('VALIDATION', 'Açıklama veya teslim alma bilgisi sınırı aşıyor.');
  end if;

  result := public.app_command(p_action, p_payload);
  if not coalesce((result->>'ok')::boolean, false) then
    return result;
  end if;
  listing_id := (result->'data'->>'id')::uuid;
  update public.listings
  set description = description_value,
      pickup_instructions = instructions_value
  where id = listing_id and business_id = actor
  returning * into listing_row;
  if not found then
    return app_private.failure('NOT_FOUND', 'İlan bulunamadı.');
  end if;
  return app_private.success(to_jsonb(listing_row));
exception
  when check_violation or not_null_violation or invalid_text_representation
    or numeric_value_out_of_range then
    return app_private.failure('VALIDATION', 'Gönderilen alanları kontrol edin.');
end $$;

revoke all on function public.listing_details_command(text, jsonb)
  from public, anon, authenticated;
grant execute on function public.listing_details_command(text, jsonb)
  to authenticated;
