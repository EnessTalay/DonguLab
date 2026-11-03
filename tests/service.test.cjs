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
