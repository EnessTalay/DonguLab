-- Run only as project administrator, after creating the two email-confirmed Auth users.
-- Safe to rerun: no auth user/password is embedded and existing records are untouched.
do $$
declare student uuid; business uuid;
begin
  select id into student from auth.users where lower(email)='ogrenci@demo.local';
  select id into business from auth.users where lower(email)='isletme@demo.local';
  if student is null or business is null then
    raise exception 'Önce Auth bölümünde ogrenci@demo.local ve isletme@demo.local hesaplarını oluşturun.';
  end if;
  update public.profiles set role='student',display_name='Demo Öğrenci' where id=student;
  update public.profiles set role='business',display_name='Demo İşletme' where id=business;
  insert into public.listings(id,business_id,title,material_type,width_mm,height_mm,thickness_mm,quantity_on_hand,region,pickup_deadline)
  values
    ('20000000-0000-0000-0000-000000000001',business,'Atölyeden kontrplak parçaları','wood',600,400,6,12,'İstanbul',(now() at time zone 'Europe/Istanbul')::date+7),
    ('20000000-0000-0000-0000-000000000002',business,'Küçük ahşap parçalar','wood',100,100,6,8,'İstanbul',(now() at time zone 'Europe/Istanbul')::date+7),
    ('20000000-0000-0000-0000-000000000003',business,'Alüminyum levha','metal',600,400,6,4,'İstanbul',(now() at time zone 'Europe/Istanbul')::date+7),
    ('20000000-0000-0000-0000-000000000004',business,'Kalınlığı doğrulanacak ahşap','wood',600,400,null,5,'İstanbul',(now() at time zone 'Europe/Istanbul')::date+7)
  on conflict(id) do nothing;
  insert into public.needs(id,student_id,project_name,material_type,width_mm,height_mm,thickness_mm,quantity,region,needed_by)
  values('30000000-0000-0000-0000-000000000001',student,'Mimari maket','wood',300,200,6,3,'İstanbul',(now() at time zone 'Europe/Istanbul')::date+3)
  on conflict(id) do nothing;
end $$;
