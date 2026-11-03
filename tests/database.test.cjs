const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
let db;
let legacy;
const S = '10000000-0000-0000-0000-000000000001';
const B = '10000000-0000-0000-0000-000000000002';
const OTHER = '10000000-0000-0000-0000-000000000003';
const OTHER_B = '10000000-0000-0000-0000-000000000004';
async function actor(id) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? '']);
  await db.exec(id ? 'set role authenticated' : 'set role anon');
}
async function cmd(action, payload, id) {
  await actor(id);
  return (await db.query('select public.app_command($1,$2::jsonb) as result', [action, JSON.stringify(payload)])).rows[0].result;
}
async function listingDetails(action, payload, id) {
  await actor(id);
  return (await db.query(
    'select public.listing_details_command($1,$2::jsonb) as result',
    [action, JSON.stringify(payload)],
  )).rows[0].result;
}
const ok = result => { assert.equal(result.ok, true, JSON.stringify(result)); return result.data; };
const rejected = (result, code) => { assert.equal(result.ok, false); assert.equal(result.error.code, code); };
const future = () => { const d = new Date(); d.setUTCDate(d.getUTCDate() + 5); return d.toISOString().slice(0,10); };
const listingInput = () => ({ title: 'Test ahşap', materialType: 'wood', widthMm: 600, heightMm: 400,
  description: 'Temiz test ahşabı.', pickupInstructions: 'Atölyeden randevuyla teslim alın.',
  thicknessMm: 6, quantityOnHand: 5, region: 'İstanbul', pickupDeadline: future() });
const needInput = () => ({ projectName: 'Test maket', materialType: 'wood', widthMm: 300, heightMm: 200,
  thicknessMm: 6, quantity: 3, region: 'İSTANBUL', neededBy: future() });
async function fixture() {
  const l = ok(await cmd('create_listing', listingInput(), B));
  const n = ok(await cmd('create_need', needInput(), S));
  const r = ok(await cmd('create_request', { needId: n.id, listingId: l.id }, S));
  return { l,n,r };
}
async function stock(id) {
  await actor(B);
  return (await db.query('select quantity_on_hand,quantity_reserved from public.listings where id=$1',[id])).rows[0];
}
before(async () => {
  db = new PGlite();
  // Only the platform auth facade is stubbed; run the actual migrations.
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;`);
  const migrations = path.join(__dirname, '../supabase/migrations');
  const files=fs.readdirSync(migrations).filter(f=>f.endsWith('.sql')).sort();
  await db.exec(fs.readFileSync(path.join(migrations,files[0]),'utf8'));
  for (const [id,email] of [[S,'s@test'],[B,'b@test'],[OTHER,'other@test'],[OTHER_B,'b2@test']]) {
    await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,'{\"role\":\"business\"}')",[id,email]);
  }
  await db.query("update public.profiles set role='business' where id in ($1,$2)",[B,OTHER_B]);
  legacy=await fixture();
  ok(await cmd('approve_request',{requestId:legacy.r.id},B));
  await db.exec('reset role');
  for (const file of files.slice(1)) await db.exec(fs.readFileSync(path.join(migrations,file),'utf8'));
});
after(async () => { if (db) await db.close(); });

test('SQL reasons commit with authorized transitions and are shared without leaking to other accounts', async () => {
  const {l,n,r}=await fixture();
  rejected(await cmd('reject_request',{requestId:r.id,reason:'Yetkisiz'},OTHER_B),'FORBIDDEN');
  rejected(await cmd('reject_request',{requestId:r.id,reason:'x'.repeat(501)},B),'VALIDATION');
  rejected(await cmd('reject_request',{requestId:r.id,reason:123},B),'VALIDATION');
  await actor(S);
  assert.equal((await db.query('select rejection_reason from public.requests where id=$1',[r.id])).rows[0].rejection_reason,null);
  const rejectedRequest=ok(await cmd('reject_request',{requestId:r.id,reason:'  Hasarlı stok  '},B));
  assert.equal(rejectedRequest.rejection_reason,'Hasarlı stok');
  assert.equal(ok(await cmd('reject_request',{requestId:r.id,reason:'Farklı'},B)).rejection_reason,'Hasarlı stok');
  await actor(S);
  const views=ok((await db.query("select public.list_request_views('student') as result")).rows[0].result);
  assert.equal(views.find(v=>v.request.id===r.id).request.rejection_reason,'Hasarlı stok');
  await actor(OTHER);
  assert.equal((await db.query('select * from public.requests where id=$1',[r.id])).rows.length,0);
  const next=ok(await cmd('create_request',{needId:n.id,listingId:l.id},S));
  ok(await cmd('approve_request',{requestId:next.id},B));
  rejected(await cmd('cancel_request',{requestId:next.id,reason:'x'.repeat(501)},S),'VALIDATION');
  assert.deepEqual(await stock(l.id),{quantity_on_hand:5,quantity_reserved:3});
  ok(await cmd('cancel_request',{requestId:next.id,reason:'Proje ertelendi'},S));
  assert.equal(ok(await cmd('cancel_request',{requestId:next.id,reason:'Başka'},S)).cancellation_reason,'Proje ertelendi');
  assert.deepEqual(await stock(l.id),{quantity_on_hand:5,quantity_reserved:0});
  await actor(B);
  const incoming=ok((await db.query("select public.list_request_views('business') as result")).rows[0].result);
  assert.equal(incoming.find(v=>v.request.id===next.id).request.cancellation_reason,'Proje ertelendi');
  ok(await cmd('close_listing',{listingId:l.id},B));
  await actor(S);
  const closed=(await db.query('select * from public.listings where id=$1',[l.id])).rows[0];
  assert.equal(closed.status,'closed'); assert.equal(closed.width_mm, '600');
});

test('SQL upgrade preserves existing approved requests, stock and active defaults', async () => {
  assert.deepEqual(await stock(legacy.l.id),{quantity_on_hand:5,quantity_reserved:3});
  await actor(S);
  assert.equal((await db.query('select status from public.needs where id=$1',[legacy.n.id])).rows[0].status,'active');
  assert.equal((await db.query('select status from public.listings where id=$1',[legacy.l.id])).rows[0].status,'active');
  assert.equal((await db.query('select status from public.requests where id=$1',[legacy.r.id])).rows[0].status,'approved');
  const code=ok(await cmd('issue_delivery_code',{requestId:legacy.r.id},S));
  ok(await cmd('confirm_delivery',{requestId:legacy.r.id,code:code.code},B));
  ok(await cmd('archive_need',{needId:legacy.n.id},S));
  ok(await cmd('close_listing',{listingId:legacy.l.id},B));
  assert.deepEqual(await stock(legacy.l.id),{quantity_on_hand:2,quantity_reserved:0});
  await db.exec('reset role');
  assert.equal(
    (await db.query('select status from public.requests where id=$1', [legacy.r.id])).rows[0].status,
    'delivered',
  );
  assert.equal(
    (await db.query('select count(*)::int as count from public.deliveries where request_id=$1', [legacy.r.id])).rows[0].count,
    1,
  );
});

test('SQL role assignment ignores user metadata; RLS and grants prevent escalation', async () => {
  await actor(S);
  assert.equal((await db.query('select role from public.profiles')).rows[0].role,'student');
  await assert.rejects(db.exec("update public.profiles set role='business'"), /permission denied/i);
  await assert.rejects(db.exec('select * from public.deliveries'), /permission denied/i);
  await assert.rejects(db.exec("select app_private.actor_role()"), /permission denied/i);
  rejected(await cmd('create_listing',listingInput(),S),'FORBIDDEN');
  await actor(null);
  assert.equal((await db.query("select has_function_privilege('anon','public.app_command(text,jsonb)','execute') as allowed")).rows[0].allowed,false);
  await assert.rejects(db.exec('select * from public.listings'), /permission denied/i);
});
test('SQL validates numbers and server-owned fields, rejects absent thickness', async () => {
  rejected(await cmd('create_listing',{ ...listingInput(), quantityOnHand: 1.5 },B),'VALIDATION');
  rejected(await cmd('create_need',{ ...needInput(), thicknessMm: null },S),'VALIDATION');
  rejected(await cmd('create_listing',{ ...listingInput(), widthMm: 'NaN' },B),'VALIDATION');
  const l=ok(await cmd('create_listing',{ ...listingInput(), businessId: OTHER_B, quantityReserved: 100 },B));
  assert.equal(l.business_id,B); assert.equal(l.quantity_reserved,0);
  const n=ok(await cmd('create_need',needInput(),S));
  const noThickness=ok(await cmd('create_listing',{...listingInput(),thicknessMm:null},B));
  rejected(await cmd('create_request',{needId:n.id,listingId:noThickness.id},S),'INCOMPATIBLE');
});
test('SQL ownership checks and RLS isolate other students and businesses', async () => {
  const { l,n,r }=await fixture();
  rejected(await cmd('create_request',{needId:n.id,listingId:l.id},OTHER),'NOT_FOUND');
  rejected(await cmd('approve_request',{requestId:r.id},OTHER_B),'FORBIDDEN');
  rejected(await cmd('cancel_request',{requestId:r.id},OTHER),'FORBIDDEN');
  await actor(OTHER);
  assert.equal((await db.query('select * from public.needs where id=$1',[n.id])).rows.length,0);
  assert.equal((await db.query('select * from public.requests where id=$1',[r.id])).rows.length,0);
  await actor(B);
  assert.equal((await db.query('select * from public.needs where id=$1',[n.id])).rows.length,1);
});
test('SQL duplicate request and approval are idempotent; competing approvals cannot oversell', async () => {
  const {l,n,r}=await fixture();
  assert.equal(ok(await cmd('create_request',{needId:n.id,listingId:l.id},S)).id,r.id);
  const n2=ok(await cmd('create_need',needInput(),S));
  const r2=ok(await cmd('create_request',{needId:n2.id,listingId:l.id},S));
  ok(await cmd('approve_request',{requestId:r.id},B));
  ok(await cmd('approve_request',{requestId:r.id},B));
  rejected(await cmd('approve_request',{requestId:r2.id},B),'OUT_OF_STOCK');
  assert.deepEqual(await stock(l.id),{quantity_on_hand:5,quantity_reserved:3});
  await actor(B);
  await assert.rejects(db.query('update public.listings set quantity_reserved=0 where id=$1',[l.id]),/permission denied/i);
});
test('SQL code rotation, durable wrong attempts, private DTOs and single delivery', async () => {
  const {l,r}=await fixture(); ok(await cmd('approve_request',{requestId:r.id},B));
  const old=ok(await cmd('issue_delivery_code',{requestId:r.id},S));
  const fresh=ok(await cmd('issue_delivery_code',{requestId:r.id},S));
  assert.match(fresh.code,/^\d{6}$/);
  assert.notEqual(old.code,fresh.code);
  rejected(await cmd('confirm_delivery',{requestId:r.id,code:old.code},B),'INVALID_CODE');
  await actor(B);
  const views=(await db.query("select public.list_request_views('business') as result")).rows[0].result;
  assert.equal(views.ok,true); assert.equal(JSON.stringify(views).includes('code_hash'),false);
  assert.equal(JSON.stringify(views).includes('"code"'),false);
  rejected(await cmd('issue_delivery_code',{requestId:r.id},B),'FORBIDDEN');
  ok(await cmd('confirm_delivery',{requestId:r.id,code:fresh.code},B));
  ok(await cmd('confirm_delivery',{requestId:r.id,code:fresh.code},B));
  assert.deepEqual(await stock(l.id),{quantity_on_hand:2,quantity_reserved:0});
  await actor(S); await assert.rejects(db.exec('select code_hash from public.deliveries'),/permission denied/i);
});
test('SQL failed-attempt count is committed on error and cannot be reset by rotation', async () => {
  const {l,r}=await fixture(); ok(await cmd('approve_request',{requestId:r.id},B));
  ok(await cmd('issue_delivery_code',{requestId:r.id},S));
  for(let i=0;i<5;i++) rejected(await cmd('confirm_delivery',{requestId:r.id,code:'bad'},B),'INVALID_CODE');
  rejected(await cmd('issue_delivery_code',{requestId:r.id},S),'TOO_MANY_ATTEMPTS');
  rejected(await cmd('confirm_delivery',{requestId:r.id,code:'000000'},B),'TOO_MANY_ATTEMPTS');
  await db.exec('reset role');
  assert.equal((await db.query('select failed_attempts from public.deliveries where request_id=$1',[r.id])).rows[0].failed_attempts,5);
  assert.deepEqual(await stock(l.id),{quantity_on_hand:5,quantity_reserved:3});
});
test('SQL cancellation and scheduled/on-demand expiration release reservations once', async () => {
  const {l,r}=await fixture(); ok(await cmd('approve_request',{requestId:r.id},B));
  await db.exec('reset role');
  await db.query("update public.requests set expires_at=now()-interval '1 second' where id=$1",[r.id]);
  await actor(S); await db.exec('select public.refresh_reservations(); select public.refresh_reservations();');
  ok(await cmd('cancel_request',{requestId:r.id},S));
  rejected(await cmd('issue_delivery_code',{requestId:r.id},S),'CONFLICT');
  assert.deepEqual(await stock(l.id),{quantity_on_hand:5,quantity_reserved:0});
  const f=await fixture(); ok(await cmd('approve_request',{requestId:f.r.id},B));
  ok(await cmd('cancel_request',{requestId:f.r.id},S)); ok(await cmd('cancel_request',{requestId:f.r.id},S));
  assert.deepEqual(await stock(f.l.id),{quantity_on_hand:5,quantity_reserved:0});
});
test('admin demo seed is repeatable and never resets existing stock', async () => {
  await db.exec('reset role');
  await db.query('update auth.users set email=$1 where id=$2',['ogrenci@demo.local',S]);
  await db.query('update auth.users set email=$1 where id=$2',['isletme@demo.local',B]);
  const seed=fs.readFileSync(path.join(__dirname,'../supabase/seed.sql'),'utf8');
  await db.exec(seed);
  const id='20000000-0000-0000-0000-000000000001';
  await db.query('update public.listings set quantity_on_hand=7 where id=$1',[id]);
  await db.exec(seed);
  assert.equal((await db.query('select quantity_on_hand from public.listings where id=$1',[id])).rows[0].quantity_on_hand,7);
  assert.equal((await db.query("select count(*)::int as count from public.listings where id::text like '20000000-%'")).rows[0].count,4);
});

test('SQL lifecycle commands enforce ownership and keep server-owned fields immutable', async () => {
  const l=ok(await cmd('create_listing', {...listingInput(), status:'closed'}, B));
  const n=ok(await cmd('create_need', {...needInput(), status:'archived'}, S));
  assert.equal(l.status,'active'); assert.equal(n.status,'active');
  for (const action of ['update_listing','close_listing']) {
    rejected(await cmd(action,{...listingInput(),listingId:l.id},OTHER_B),'NOT_FOUND');
    rejected(await cmd(action,{...listingInput(),listingId:l.id},S),'FORBIDDEN');
  }
  for (const action of ['update_need','archive_need']) {
    rejected(await cmd(action,{...needInput(),needId:n.id},OTHER),'NOT_FOUND');
    rejected(await cmd(action,{...needInput(),needId:n.id},B),'FORBIDDEN');
  }
  const edited=ok(await cmd('update_listing',{...listingInput(),listingId:l.id,title:'Yeni başlık',quantityOnHand:8,
    businessId:OTHER_B,quantityReserved:7,status:'closed'},B));
  assert.equal(edited.title,'Yeni başlık'); assert.equal(edited.quantity_on_hand,8);
  assert.equal(edited.business_id,B); assert.equal(edited.quantity_reserved,0); assert.equal(edited.status,'active');
  const changed=ok(await cmd('update_need',{...needInput(),needId:n.id,quantity:2,studentId:OTHER,status:'archived'},S));
  assert.equal(changed.quantity,2); assert.equal(changed.student_id,S); assert.equal(changed.status,'active');
  rejected(await cmd('update_listing',{...listingInput(),listingId:l.id,quantityOnHand:1.5},B),'VALIDATION');
  rejected(await cmd('update_need',{...needInput(),needId:n.id,thicknessMm:null},S),'VALIDATION');
  assert.equal((await stock(l.id)).quantity_on_hand,8);
});

test('SQL listing details are owner-only, validated, atomic with stock rules, and preserve requests', async () => {
  const l = ok(await listingDetails('create_listing', {
    ...listingInput(),
    description: 'Kullanılabilir ahşap parçalar.',
    pickupInstructions: 'Randevuyla atölyeden teslim alın.',
  }, B));
  assert.equal(l.description, 'Kullanılabilir ahşap parçalar.');
  assert.equal(l.pickup_instructions, 'Randevuyla atölyeden teslim alın.');
  rejected(await listingDetails('update_listing', {
    ...listingInput(),
    listingId: l.id,
    description: 'Başkasının ilanı',
  }, OTHER_B), 'NOT_FOUND');
  rejected(await listingDetails('create_listing', {
    ...listingInput(),
    description: 'a'.repeat(2001),
  }, B), 'VALIDATION');
  rejected(await listingDetails('create_listing', {
    ...listingInput(),
    pickupInstructions: 'a'.repeat(1001),
  }, B), 'VALIDATION');

  const changed = ok(await listingDetails('update_listing', {
    ...listingInput(),
    listingId: l.id,
    title: 'Güncellenen başlık',
    description: 'Yeni açıklama',
    pickupInstructions: 'Yeni teslim bilgisi',
    quantityOnHand: 8,
  }, B));
  assert.equal(changed.description, 'Yeni açıklama');
  assert.equal(changed.pickup_instructions, 'Yeni teslim bilgisi');
  assert.equal(changed.quantity_on_hand, 8);

  const n = ok(await cmd('create_need', needInput(), S));
  const r = ok(await cmd('create_request', { needId: n.id, listingId: l.id }, S));
  ok(await cmd('approve_request', { requestId: r.id }, B));
  rejected(await listingDetails('update_listing', {
    ...listingInput(),
    listingId: l.id,
    quantityOnHand: 2,
    description: 'Bu değişiklik uygulanmamalı.',
  }, B), 'CONFLICT');
  assert.deepEqual(await stock(l.id), {
    quantity_on_hand: 8,
    quantity_reserved: 3,
  });
  rejected(await cmd('close_listing', { listingId: l.id }, B), 'CONFLICT');
  ok(await cmd('cancel_request', { requestId: r.id }, S));
  assert.equal(ok(await cmd('close_listing', { listingId: l.id }, B)).status, 'closed');
  await actor(B);
  const preserved = await db.query(
    'select status from public.requests where id = $1',
    [r.id],
  );
  assert.equal(preserved.rows[0].status, 'cancelled');
  const details = await db.query(
    'select description, pickup_instructions from public.listings where id = $1',
    [l.id],
  );
  assert.deepEqual(details.rows[0], {
    description: 'Yeni açıklama',
    pickup_instructions: 'Yeni teslim bilgisi',
  });
  rejected(await cmd('create_request', { needId: n.id, listingId: l.id }, S), 'INCOMPATIBLE');
});

test('SQL request history freezes edits; open requests prevent closing and archiving', async () => {
  const {l,n,r}=await fixture();
  const blocked=async()=>{
    rejected(await cmd('update_listing',{...listingInput(),listingId:l.id},B),'CONFLICT');
    rejected(await cmd('update_need',{...needInput(),needId:n.id},S),'CONFLICT');
    rejected(await cmd('close_listing',{listingId:l.id},B),'CONFLICT');
    rejected(await cmd('archive_need',{needId:n.id},S),'CONFLICT');
  };
  await blocked(); ok(await cmd('approve_request',{requestId:r.id},B)); await blocked();
  assert.deepEqual(await stock(l.id),{quantity_on_hand:5,quantity_reserved:3});
  ok(await cmd('cancel_request',{requestId:r.id},S));
  rejected(await cmd('update_listing',{...listingInput(),listingId:l.id},B),'CONFLICT');
  rejected(await cmd('update_need',{...needInput(),needId:n.id},S),'CONFLICT');
  assert.equal(ok(await cmd('close_listing',{listingId:l.id},B)).status,'closed');
  assert.equal(ok(await cmd('close_listing',{listingId:l.id},B)).status,'closed');
  assert.equal(ok(await cmd('archive_need',{needId:n.id},S)).status,'archived');
  assert.equal(ok(await cmd('archive_need',{needId:n.id},S)).status,'archived');
  rejected(await cmd('create_request',{needId:n.id,listingId:l.id},S),'INCOMPATIBLE');
  assert.deepEqual(await stock(l.id),{quantity_on_hand:5,quantity_reserved:0});
});

test('SQL closed/archived records reject new requests and updates independently', async () => {
  const l=ok(await cmd('create_listing',listingInput(),B));
  const n=ok(await cmd('create_need',needInput(),S));
  ok(await cmd('close_listing',{listingId:l.id},B));
  rejected(await cmd('create_request',{needId:n.id,listingId:l.id},S),'INCOMPATIBLE');
  rejected(await cmd('update_listing',{...listingInput(),listingId:l.id},B),'CONFLICT');
  const l2=ok(await cmd('create_listing',listingInput(),B));
  ok(await cmd('archive_need',{needId:n.id},S));
  rejected(await cmd('create_request',{needId:n.id,listingId:l2.id},S),'INCOMPATIBLE');
  rejected(await cmd('update_need',{...needInput(),needId:n.id},S),'CONFLICT');

  const expiredListing = ok(await cmd('create_listing', listingInput(), B));
  const anotherNeed = ok(await cmd('create_need', needInput(), S));
  await db.exec('reset role');
  await db.query(
    "update public.listings set pickup_deadline='2020-01-01' where id=$1",
    [expiredListing.id],
  );
  rejected(
    await cmd(
      'create_request',
      { needId: anotherNeed.id, listingId: expiredListing.id },
      S,
    ),
    'INCOMPATIBLE',
  );
});

test('SQL archive expires reservations once and preserves request history', async () => {
  const {l,n,r}=await fixture(); ok(await cmd('approve_request',{requestId:r.id},B));
  await db.exec('reset role');
  await db.query("update public.requests set expires_at=now()-interval '1 second' where id=$1",[r.id]);
  ok(await cmd('archive_need',{needId:n.id},S));
  ok(await cmd('archive_need',{needId:n.id},S));
  ok(await cmd('close_listing',{listingId:l.id},B));
  assert.deepEqual(await stock(l.id),{quantity_on_hand:5,quantity_reserved:0});
  await actor(S);
  const views=ok((await db.query("select public.list_request_views('student') as result")).rows[0].result);
  assert.equal(views.find(v=>v.request.id===r.id).request.status,'cancelled');
});

test('SQL matching enforces rotation, normalized region, material, thickness and stock', async () => {
  const n=ok(await cmd('create_need',{...needInput(),widthMm:500,heightMm:300,region:'  İSTANBUL   MERKEZ '},S));
  const base={...listingInput(),widthMm:300,heightMm:500,region:'istanbul merkez'};
  const rotated=ok(await cmd('create_listing',base,B));
  for (const [changes,error] of [
    [{materialType:'metal'},'INCOMPATIBLE'],[{thicknessMm:8},'INCOMPATIBLE'],
    [{widthMm:299},'INCOMPATIBLE'],[{region:'Ankara'},'INCOMPATIBLE'],
    [{quantityOnHand:2},'OUT_OF_STOCK'],
  ]) {
    const l=ok(await cmd('create_listing',{...base,...changes},B));
    rejected(await cmd('create_request',{needId:n.id,listingId:l.id},S),error);
  }
  assert.equal(ok(await cmd('create_request',{needId:n.id,listingId:rotated.id},S)).status,'pending');
  rejected(await cmd('create_listing',{...base,pickupDeadline:'2020-01-01'},B),'VALIDATION');
  rejected(await cmd('create_need',{...needInput(),neededBy:'2020-01-01'},S),'VALIDATION');
});
