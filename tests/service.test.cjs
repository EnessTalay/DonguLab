require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDemoServices, createDemoStore } = require('../src/services/mock.ts');
const { validDate } = require('../src/services/validation.ts');
const { createSupabaseServices, mapListing } = require('../src/services/supabase.ts');
const now = new Date('2030-01-01T12:00:00Z');
const listing = { id: 'l1', businessId: 'demo-business', title: 'Ahşap', materialType: 'wood',
  widthMm: 600, heightMm: 400, thicknessMm: 6, region: 'İstanbul', quantityOnHand: 5,
  quantityReserved: 0, pickupDeadline: '2030-01-08' };
const need = { id: 'n1', studentId: 'demo-student', projectName: 'Maket', materialType: 'wood',
  widthMm: 300, heightMm: 200, thicknessMm: 6, region: 'İSTANBUL', quantity: 3, neededBy: '2030-01-04' };

test('real registration trims email, sends no role, and respects confirmation', async () => {
  let payload;
  let session = null;
  const service = createSupabaseServices(() => ({ auth: {
    signUp: async input => { payload = input; return { data: { session }, error: null }; },
  } }));
  await assert.rejects(service.signUp('invalid', 'longpassword'), { code: 'VALIDATION' });
  await assert.rejects(service.signUp('user@example.com', 'short'), { code: 'VALIDATION' });
  assert.equal(payload, undefined);
  assert.deepEqual(await service.signUp(' user@example.com ', 'longpassword'), { confirmationRequired: true });
  assert.deepEqual(payload, { email: 'user@example.com', password: 'longpassword' });
  session = { user: { id: 'new-user' } };
  assert.deepEqual(await service.signUp('user@example.com', 'longpassword'), { confirmationRequired: false });
});

test('registration rate limits surface as an actionable error', async () => {
  const service = createSupabaseServices(() => ({ auth: {
    signUp: async () => ({ data: {}, error: { status: 429 } }),
  } }));
  await assert.rejects(service.signUp('user@example.com', 'longpassword'), { code: 'TOO_MANY_ATTEMPTS' });
});
async function setup() {
  let time = now;
  const store = createDemoStore([listing], [need, { ...need, id: 'n2' }]);
  const student = createDemoServices(store, () => time);
  const business = createDemoServices(store, () => time);
  await student.signIn('ogrenci@demo.local', 'Demo123!');
  await business.signIn('isletme@demo.local', 'Demo123!');
  return { store, student, business, advance: () => { time = new Date('2030-01-01T15:00:00Z'); } };
}
test('duplicate request/approval/delivery never change stock twice; codes stay private', async () => {
  const { student, business, store } = await setup();
  const req = await student.createRequest('n1', 'l1');
  assert.equal((await student.createRequest('n1', 'l1')).id, req.id);
  await business.approveRequest(req.id); await business.approveRequest(req.id);
  assert.equal(store.listings[0].quantityReserved, 3);
  const old = await student.issueDeliveryCode(req.id);
  const fresh = await student.issueDeliveryCode(req.id);
  await assert.rejects(business.confirmDelivery(req.id, old.code), { code: 'INVALID_CODE' });
  assert.equal(JSON.stringify(await business.listIncomingRequests()).includes(fresh.code), false);
  await business.confirmDelivery(req.id, fresh.code); await business.confirmDelivery(req.id, fresh.code);
  assert.equal(store.listings[0].quantityOnHand, 2); assert.equal(store.listings[0].quantityReserved, 0);
});
test('simultaneous approval cannot oversell', async () => {
  const { student, business, store } = await setup();
  const a = await student.createRequest('n1', 'l1'), b = await student.createRequest('n2', 'l1');
  const results = await Promise.allSettled([business.approveRequest(a.id), business.approveRequest(b.id)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(store.listings[0].quantityReserved, 3);
});
test('expiration/cancellation release stock once', async () => {
  const { student, business, store, advance } = await setup();
  const r = await student.createRequest('n1', 'l1'); await business.approveRequest(r.id);
  advance(); await business.listMyListings(); await student.cancelRequest(r.id); await student.cancelRequest(r.id);
  assert.equal(store.listings[0].quantityReserved, 0);
  await assert.rejects(student.issueDeliveryCode(r.id), { code: 'CONFLICT' });
});
test('wrong-code limit survives rotation and mutation cannot forge ownership', async () => {
  const { student, business, store } = await setup();
  await assert.rejects(student.createListing(listing), { code: 'FORBIDDEN' });
  const created = await business.createListing({ ...listing, businessId: 'attacker', quantityReserved: 99 });
  assert.equal(created.businessId, 'demo-business'); assert.equal(created.quantityReserved, 0);
  const r = await student.createRequest('n1', 'l1'); await business.approveRequest(r.id);
  for (let i = 0; i < 5; i++) await assert.rejects(business.confirmDelivery(r.id, 'wrong'), { code: 'INVALID_CODE' });
  await assert.rejects(student.issueDeliveryCode(r.id), { code: 'TOO_MANY_ATTEMPTS' });
  assert.equal(store.listings[0].quantityOnHand, 5);
  const result = await business.listMyListings(); result[0].quantityOnHand = 999;
  assert.equal(store.listings[0].quantityOnHand, 5);
});
test('missing thickness/incompatible dates rejected; strict date validation', async () => {
  const { student, store } = await setup();
  store.listings[0].thicknessMm = null;
  await assert.rejects(student.createRequest('n1', 'l1'), { code: 'INCOMPATIBLE' });
  assert.equal(validDate('2030-02-30'), false); assert.equal(validDate('2030-01-01'), true);
  await assert.rejects(student.createNeed({ ...need, quantity: 1.2 }), { code: 'VALIDATION' });
});
test('real adapter maps database fields and turns RPC failures into AppError', async () => {
  const row={id:'l1',business_id:'owner',title:'Ahşap',material_type:'wood',width_mm:'600',height_mm:400,
    thickness_mm:null,quantity_on_hand:12,quantity_reserved:2,region:'İstanbul',pickup_deadline:'2030-01-08'};
  const mapped=mapListing(row);
  assert.equal(mapped.businessId,'owner'); assert.equal(mapped.widthMm,600); assert.equal(mapped.thicknessMm,null);
  const calls=[];
  const api=createSupabaseServices(() => ({ rpc: async (name,params) => {
    calls.push({name,params}); return { data:{ok:false,error:{code:'OUT_OF_STOCK',message:'Yeterli stok yok.'}},error:null };
  } }));
  await assert.rejects(api.createRequest('need-id','listing-id'), {name:'AppError',code:'OUT_OF_STOCK'});
  assert.deepEqual(calls,[{name:'app_command',params:{p_action:'create_request',p_payload:{needId:'need-id',listingId:'listing-id'}}}]);
});
test('late auth profile result cannot restore a signed-out Supabase session', async () => {
  let callback, resolveSession;
  const authSession = new Promise(resolve => { resolveSession=resolve; });
  const client={auth:{onAuthStateChange:cb=>{callback=cb;return {data:{subscription:{unsubscribe(){}}}};},
    getSession:()=>authSession},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{id:'s',role:'student',display_name:'Öğrenci'},error:null})})})})};
  const api=createSupabaseServices(()=>client);
  const received=[]; const stop=api.onAuthStateChange(s=>received.push(s));
  callback('SIGNED_IN',{user:{id:'s'}});
  await new Promise(resolve=>setTimeout(resolve,5));
  callback('SIGNED_OUT',null);
  resolveSession({data:{session:{user:{id:'s'}}},error:null});
  await new Promise(resolve=>setTimeout(resolve,5));
  assert.deepEqual(received,[null]); stop();
});


test('student matching agrees with shared transaction eligibility', () => {
  const { matchListing } = require('../src/features/student/matching.ts');
  const day = '2030-01-01';
  assert.equal(matchListing(need, listing, day).eligible, true);
  assert.equal(matchListing(need, { ...listing, widthMm: 200, heightMm: 300 }, day).eligible, true);
  assert.equal(matchListing(need, { ...listing, region: 'Ankara' }, day).eligible, false);
  assert.equal(matchListing(need, { ...listing, thicknessMm: null }, day).eligible, false);
  assert.equal(matchListing(need, { ...listing, quantityReserved: 3 }, day).eligible, false);
  assert.equal(matchListing(need, { ...listing, pickupDeadline: '2029-12-31' }, day).eligible, false);
});

test('need form validates real calendar dates, required thickness and server limits', () => {
  const { parseNeedForm } = require('../src/features/student/need-form.ts');
  const { validateNeed } = require('../src/services/validation.ts');
  const draft = { projectName: ' Model ', materialType: 'wood', widthMm: '300,5', heightMm: '200',
    thicknessMm: '6', quantity: '3', region: ' Istanbul ', neededBy: '2030-01-04' };
  const parsed = parseNeedForm(draft, '2030-01-01');
  assert.equal(parsed.input.widthMm, 300.5);
  assert.equal(parsed.input.projectName, 'Model');
  assert.doesNotThrow(() => validateNeed(parsed.input, '2030-01-01'));
  for (const [field, value] of [['thicknessMm', ''], ['widthMm', '1000000000'], ['quantity', '1.5'],
    ['quantity', '2147483648'], ['neededBy', '2030-02-30'], ['neededBy', '2029-12-31'],
    ['neededBy', '01/04/2030'], ['projectName', 'a'.repeat(201)], ['region', 'a'.repeat(121)]]) {
    const invalid = parseNeedForm({ ...draft, [field]: value }, '2030-01-01');
    assert.equal(invalid.input, null, field);
    assert.ok(invalid.errors[field], field);
  }
  const invalid = parseNeedForm({ ...draft, thicknessMm: '' }, '2030-01-01');
  assert.ok(invalid.errors.thicknessMm);
  assert.ok(parseNeedForm(draft, '2030-01-01').input, 'corrected form can be resubmitted');
});

test('matching puts eligible listings first even when invalid records score equally', () => {
  const { rankMatches } = require('../src/features/student/matching.ts');
  const result = rankMatches(need, [{ ...listing, id: 'invalid', title: '' }, listing], '2030-01-01');
  assert.equal(result[0].listing.id, listing.id);
  assert.equal(result[0].eligible, true);
  assert.equal(result[1].eligible, false);
});

test('extracted listing form preserves optional thickness and decimal input contract', () => {
  const { parseListingForm } = require('../src/features/business/listing-form.ts');
  const { validateListing } = require('../src/services/validation.ts');
  const form = { title: ' Workshop ', widthMm: '600,5', heightMm: '400', thicknessMm: '',
    quantityOnHand: '5', region: ' Istanbul ', pickupDeadline: '2030-01-08' };
  const result = parseListingForm(form, 'wood');
  assert.deepEqual(result.errors, {});
  assert.equal(result.input.thicknessMm, null);
  assert.equal(result.input.widthMm, 600.5);
  assert.equal(result.input.title, 'Workshop');
  assert.doesNotThrow(() => validateListing(result.input, '2030-01-01'));
  assert.ok(parseListingForm({ ...form, quantityOnHand: '1.5' }, 'wood').errors.quantityOnHand);
  assert.ok(parseListingForm({ ...form, thicknessMm: 'bad' }, 'wood').errors.thicknessMm);
  assert.ok(parseListingForm({ ...form, pickupDeadline: '2030-02-30' }, 'wood').errors.pickupDeadline);
});

test('shared date helpers retain Istanbul day boundaries and strict calendar validation', () => {
  const { istanbulDate, validDate, dateFromIstanbulDate, formatDateTime } = require('../src/lib/dates.ts');
  assert.equal(istanbulDate(new Date('2030-01-01T20:59:59Z')), '2030-01-01');
  assert.equal(istanbulDate(new Date('2030-01-01T21:00:00Z')), '2030-01-02');
  assert.equal(istanbulDate(dateFromIstanbulDate('2030-01-02')), '2030-01-02');
  assert.equal(validDate('2030-02-29'), false);
  assert.equal(validDate('2032-02-29'), true);
  assert.equal(formatDateTime('not-a-date'), null);
});
