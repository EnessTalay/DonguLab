require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDemoServices, createDemoStore } = require('../src/services/mock.ts');
const { validDate } = require('../src/services/validation.ts');
const { createSupabaseServices, mapListing } = require('../src/services/supabase.ts');
const { parseListingForm, emptyForm } = require('../src/features/business/listing-form.ts');
const { getAvailableStock, getListingAvailability } = require('../src/features/business/listing-state.ts');
const { requestsForListing } = require('../src/features/business/listing-requests.ts');
const now = new Date('2030-01-01T12:00:00Z');
const listing = { id: 'l1', status: 'active', businessId: 'demo-business', title: 'Ahşap', materialType: 'wood',
  description: 'Temiz ahşap parçalar.', pickupInstructions: 'Atölyeden randevuyla teslim alın.',
  widthMm: 600, heightMm: 400, thicknessMm: 6, region: 'İstanbul', quantityOnHand: 5,
  quantityReserved: 0, pickupDeadline: '2030-01-08' };
const need = { id: 'n1', status: 'active', studentId: 'demo-student', projectName: 'Maket', materialType: 'wood',
  widthMm: 300, heightMm: 200, thicknessMm: 6, region: 'İSTANBUL', quantity: 3, neededBy: '2030-01-04' };

test('selection only blocks an existing request for the selected need, not another project', () => {
  const {existingRequestForNeed}=require('../src/features/student/need-list.ts');
  const rows=[{request:{listingId:'l1',needId:'n1',status:'delivered'}}];
  assert.equal(existingRequestForNeed(rows,'l1','n1'),rows[0]);
  assert.equal(existingRequestForNeed(rows,'l1','n2'),undefined);
  assert.equal(existingRequestForNeed(rows,'l1',null),undefined);
  assert.equal(existingRequestForNeed([{request:{listingId:'l1',needId:'n2',status:'rejected'}}],'l1','n2'),undefined);
});

test('persistent drafts survive a fresh store, isolate accounts, tolerate corrupt data and serialize clear', async () => {
  const {createNeedDraftStorage}=require('../src/features/student/draft-storage.ts');
  const values=new Map();
  const disk={getItem:async key=>values.get(key)??null,
    setItem:async(key,value)=>{await new Promise(r=>setTimeout(r,2));values.set(key,value);},
    removeItem:async key=>values.delete(key)};
  const baseline={projectName:'',materialType:'wood',widthMm:'',heightMm:'',thicknessMm:'',quantity:'',region:'',neededBy:'2030-01-04'};
  const draft={...baseline,projectName:'Kalıcı maket'};
  const first=createNeedDraftStorage(disk,'student-1');
  await first.save(draft);
  assert.deepEqual(await createNeedDraftStorage(disk,'student-1').load(baseline),draft);
  assert.deepEqual(await createNeedDraftStorage(disk,'student-2').load(baseline),baseline);
  const saving=first.save({...draft,projectName:'Son yazım'});
  const clearing=first.clear(); await Promise.all([saving,clearing]);
  assert.deepEqual(await createNeedDraftStorage(disk,'student-1').load(baseline),baseline);
  values.set('dongulab:need-draft:v1:student-1','{broken');
  assert.deepEqual(await first.load(baseline),baseline);
  const failing=createNeedDraftStorage({...disk,setItem:async()=>{throw Error('disk full');}},'student-1');
  await assert.rejects(failing.save(draft),/disk full/);
  await failing.clear();
});

test('demo shares committed reasons across independent clients and preserves closed listing details', async () => {
  const {student,business,store}=await setup();
  const req=await student.createRequest('n1','l1');
  await assert.rejects(business.rejectRequest(req.id,'x'.repeat(501)),{code:'VALIDATION'});
  assert.equal((await student.listMyRequests())[0].request.status,'pending');
  await business.rejectRequest(req.id,'Stok hasarlı');
  const otherStudent=createDemoServices(store,()=>now);
  await otherStudent.signIn('ogrenci@demo.local','Demo123!');
  assert.equal((await otherStudent.listMyRequests())[0].request.rejectionReason,'Stok hasarlı');
  await business.rejectRequest(req.id,'Üzerine yazma');
  assert.equal((await student.listMyRequests())[0].request.rejectionReason,'Stok hasarlı');
  const next=await student.createRequest('n2','l1');
  await business.approveRequest(next.id);
  await assert.rejects(student.cancelRequest(next.id,'x'.repeat(501)),{code:'VALIDATION'});
  assert.equal((await business.listMyListings())[0].quantityReserved,3);
  await student.cancelRequest(next.id,'Proje iptal edildi');
  assert.equal((await business.listIncomingRequests()).find(v=>v.request.id===next.id).request.cancellationReason,'Proje iptal edildi');
  await business.closeListing('l1');
  assert.equal((await student.listListings()).length,0);
  assert.equal((await student.getListing('l1')).widthMm,600);
  assert.equal(await student.getListing('missing'),null);
});

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
  assert.equal(created.description, listing.description);
  assert.equal(created.pickupInstructions, listing.pickupInstructions);
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
  const row={id:'l1',status:'active',business_id:'owner',title:'Ahşap',material_type:'wood',width_mm:'600',height_mm:400,
    thickness_mm:null,quantity_on_hand:12,quantity_reserved:2,region:'İstanbul',pickup_deadline:'2030-01-08'};
  const mapped=mapListing(row);
  assert.equal(mapped.status,'active');
  assert.equal(mapped.businessId,'owner'); assert.equal(mapped.widthMm,600); assert.equal(mapped.thicknessMm,null);
  const calls=[];
  const api=createSupabaseServices(() => ({ rpc: async (name,params) => {
    calls.push({name,params}); return { data:{ok:false,error:{code:'OUT_OF_STOCK',message:'Yeterli stok yok.'}},error:null };
  } }));
  await assert.rejects(api.createRequest('need-id','listing-id'), {name:'AppError',code:'OUT_OF_STOCK'});
  assert.deepEqual(calls,[{name:'app_command',params:{p_action:'create_request',p_payload:{needId:'need-id',listingId:'listing-id'}}}]);
});

test('listing metadata validates, persists in demo, and maps through the Supabase command', async () => {
  const { student, business, store } = await setup();
  await assert.rejects(
    student.createListing(listing),
    { code: 'FORBIDDEN' },
  );
  await assert.rejects(
    business.createListing({ ...listing, description: 'a'.repeat(2001) }),
    { code: 'VALIDATION' },
  );
  await assert.rejects(
    business.createListing({ ...listing, pickupInstructions: 'a'.repeat(1001) }),
    { code: 'VALIDATION' },
  );
  const created = await business.createListing({
    ...listing,
    title: 'Açıklamalı ilan',
    description: 'Yeniden kullanılabilir malzeme.',
    pickupInstructions: 'Randevuyla atölyeden teslim alın.',
  });
  assert.equal(created.description, 'Yeniden kullanılabilir malzeme.');
  assert.equal(
    created.pickupInstructions,
    'Randevuyla atölyeden teslim alın.',
  );
  const updated = await business.updateListing(created.id, {
    ...listing,
    title: 'Güncellenmiş ilan',
    description: 'Yeni açıklama',
    pickupInstructions: 'Yeni teslim alma bilgisi',
  });
  assert.equal(updated.description, 'Yeni açıklama');
  assert.equal(updated.pickupInstructions, 'Yeni teslim alma bilgisi');
  assert.equal(
    store.listings.find((item) => item.id === created.id).description,
    'Yeni açıklama',
  );

  const calls = [];
  const api = createSupabaseServices(() => ({
    rpc: async (name, params) => {
      calls.push({ name, params });
      return {
        data: {
          ok: true,
          data: {
            id: 'listing-id',
            business_id: 'business-id',
            status: 'active',
            title: 'Supabase ilan',
            material_type: 'wood',
            width_mm: 600,
            height_mm: 400,
            thickness_mm: 6,
            quantity_on_hand: 5,
            quantity_reserved: 2,
            region: 'İstanbul',
            pickup_deadline: '2030-01-08',
            description: 'DB açıklaması',
            pickup_instructions: 'DB teslim bilgisi',
          },
        },
        error: null,
      };
    },
  }));
  const mapped = await api.createListing({
    title: 'Supabase ilan',
    description: 'DB açıklaması',
    pickupInstructions: 'DB teslim bilgisi',
    materialType: 'wood',
    widthMm: 600,
    heightMm: 400,
    thicknessMm: 6,
    quantityOnHand: 5,
    region: 'İstanbul',
    pickupDeadline: '2030-01-08',
  });
  assert.equal(mapped.description, 'DB açıklaması');
  assert.equal(mapped.pickupInstructions, 'DB teslim bilgisi');
  assert.deepEqual(calls[0], {
    name: 'listing_details_command',
    params: {
      p_action: 'create_listing',
      p_payload: {
        title: 'Supabase ilan',
        description: 'DB açıklaması',
        pickupInstructions: 'DB teslim bilgisi',
        materialType: 'wood',
        widthMm: 600,
        heightMm: 400,
        thicknessMm: 6,
        quantityOnHand: 5,
        region: 'İstanbul',
        pickupDeadline: '2030-01-08',
      },
    },
  });
});

test('listing form validates metadata and associates errors with their fields', () => {
  const valid = {
    ...emptyForm,
    title: '  Kullanılabilir malzeme  ',
    description: '  Açıklama  ',
    pickupInstructions: '  Randevu ile teslim  ',
    widthMm: '600',
    heightMm: '400',
    thicknessMm: '6',
    quantityOnHand: '8',
    region: '  İstanbul  ',
    pickupDeadline: '2030-01-08',
  };
  const parsed = parseListingForm(valid, 'wood');
  assert.deepEqual(parsed.errors, {});
  assert.equal(parsed.input.title, 'Kullanılabilir malzeme');
  assert.equal(parsed.input.description, 'Açıklama');
  assert.equal(parsed.input.pickupInstructions, 'Randevu ile teslim');

  const invalid = parseListingForm(
    {
      ...valid,
      title: '',
      description: 'a'.repeat(2001),
      pickupInstructions: 'a'.repeat(1001),
      widthMm: '0',
      heightMm: 'NaN',
      thicknessMm: '-1',
      quantityOnHand: '1.5',
      region: '',
      pickupDeadline: '2020-01-01',
    },
    'wood',
  );
  assert.equal(invalid.input, null);
  assert.deepEqual(Object.keys(invalid.errors).sort(), [
    'description',
    'heightMm',
    'pickupDeadline',
    'pickupInstructions',
    'quantityOnHand',
    'region',
    'thicknessMm',
    'title',
    'widthMm',
  ]);
});

test('listing edit enforces ownership, request history, and preserves availability', async () => {
  const { student, business, store } = await setup();
  const input = {
    ...listing,
    title: 'Düzenlenmiş ilan',
    description: 'Güncel açıklama',
    pickupInstructions: 'Güncel teslim bilgisi',
    quantityOnHand: 8,
  };
  const updated = await business.updateListing('l1', input);
  assert.equal(updated.title, 'Düzenlenmiş ilan');
  assert.equal(updated.quantityOnHand, 8);
  assert.equal(updated.quantityReserved, 0);

  store.listings[0].businessId = 'another-business';
  await assert.rejects(business.updateListing('l1', input), {
    code: 'NOT_FOUND',
  });
  store.listings[0].businessId = 'demo-business';

  const request = await student.createRequest('n1', 'l1');
  await business.approveRequest(request.id);
  await assert.rejects(
    business.updateListing('l1', { ...input, quantityOnHand: 2 }),
    { code: 'CONFLICT' },
  );
  assert.equal(store.listings[0].quantityOnHand, 8);
  assert.equal(store.listings[0].quantityReserved, 3);
});

test('listing availability distinguishes closed, expired, exhausted and available stock', () => {
  const base = { ...listing, quantityOnHand: 5, quantityReserved: 2 };
  assert.equal(getAvailableStock(base), 3);
  assert.equal(getListingAvailability(base, '2030-01-08'), 'available');
  assert.equal(
    getListingAvailability({ ...base, pickupDeadline: '2030-01-07' }, '2030-01-08'),
    'expired',
  );
  assert.equal(
    getListingAvailability({ ...base, quantityReserved: 5 }, '2030-01-08'),
    'sold-out',
  );
  assert.equal(
    getListingAvailability({ ...base, status: 'closed' }, '2030-01-08'),
    'closed',
  );
});

test('listing request filter only returns requests connected to the selected listing', () => {
  const requests = [
    { request: { id: 'r1', listingId: 'l1' } },
    { request: { id: 'r2', listingId: 'l2' } },
  ];
  assert.deepEqual(requestsForListing(requests, 'l1'), [requests[0]]);
  assert.deepEqual(requestsForListing(requests, 'missing'), []);
});

test('demo lifecycle edits whitelist fields and enforce role and ownership', async () => {
  const {student,business}=await setup();
  await assert.rejects(student.closeListing('l1'),{code:'FORBIDDEN'});
  await assert.rejects(business.archiveNeed('n1'),{code:'FORBIDDEN'});
  await assert.rejects(business.updateListing('missing',listing),{code:'NOT_FOUND'});
  const changed=await business.updateListing('l1',{...listing,title:'Yeni ilan',quantityOnHand:8,
    businessId:'foreign',quantityReserved:7,status:'closed'});
  assert.equal(changed.title,'Yeni ilan'); assert.equal(changed.quantityOnHand,8);
  assert.equal(changed.description, listing.description);
  assert.equal(changed.pickupInstructions, listing.pickupInstructions);
  assert.equal(changed.businessId,'demo-business'); assert.equal(changed.quantityReserved,0); assert.equal(changed.status,'active');
  const n=await student.updateNeed('n1',{...need,quantity:2,studentId:'foreign',status:'archived'});
  assert.equal(n.quantity,2); assert.equal(n.studentId,'demo-student'); assert.equal(n.status,'active');
  await assert.rejects(student.updateNeed('n1',{...need,quantity:1.5}),{code:'VALIDATION'});
});

test('need edit validates ownership and fields; editor draft preserves current values', async () => {
  const {student,store}=await setup();
  store.needs.push({...need,id:'other-student-need',studentId:'other-student'});
  await assert.rejects(student.updateNeed('other-student-need',need),{code:'NOT_FOUND'});
  await assert.rejects(student.archiveNeed('other-student-need'),{code:'NOT_FOUND'});
  await assert.rejects(student.updateNeed('n1',{...need,widthMm:0}),{code:'VALIDATION'});
  await assert.rejects(student.updateNeed('n1',{...need,quantity:1.5}),{code:'VALIDATION'});
  const changed=await student.updateNeed('n1',{...need,projectName:'Yeni proje',quantity:4});
  assert.equal(changed.projectName,'Yeni proje');
  assert.equal(changed.quantity,4);
  const {needToDraft}=require('../src/features/student/need-form.ts');
  assert.deepEqual(needToDraft(changed),{
    projectName:'Yeni proje',materialType:'wood',widthMm:'300',heightMm:'200',
    thicknessMm:'6',quantity:'4',region:'İSTANBUL',neededBy:'2030-01-04',
  });
});

test('need draft change detection and error focus preserve editor values', () => {
  const {needDraftHasChanges,needToDraft,firstNeedFormError}=require('../src/features/student/need-form.ts');
  const original=needToDraft(need);
  assert.equal(needDraftHasChanges(original,original),false);
  assert.equal(needDraftHasChanges({...original,projectName:'Yeni proje'},original),true);
  assert.equal(firstNeedFormError({region:'Gerekli',projectName:'Gerekli'}),'projectName');
});

test('demo open requests block lifecycle changes; cancellation preserves immutable history', async () => {
  const {student,business,store}=await setup();
  const r=await student.createRequest('n1','l1');
  const blocked=async()=>{
    await assert.rejects(business.updateListing('l1',listing),{code:'CONFLICT'});
    await assert.rejects(student.updateNeed('n1',need),{code:'CONFLICT'});
    await assert.rejects(business.closeListing('l1'),{code:'CONFLICT'});
    await assert.rejects(student.archiveNeed('n1'),{code:'CONFLICT'});
  };
  await blocked(); assert.equal(store.needs[0].status,'active');
  await business.approveRequest(r.id); await blocked();
  assert.equal(store.needs[0].status,'active');
  await student.cancelRequest(r.id);
  await assert.rejects(business.updateListing('l1',listing),{code:'CONFLICT'});
  await assert.rejects(student.updateNeed('n1',need),{code:'CONFLICT'});
  await business.closeListing('l1'); await business.closeListing('l1');
  await student.archiveNeed('n1'); await student.archiveNeed('n1');
  assert.equal((await student.listListings()).length,0);
  assert.equal((await business.listMyListings())[0].status,'closed');
  const {filterNeedsByStatus}=require('../src/features/student/need-list.ts');
  const needs=await student.listMyNeeds();
  assert.equal(filterNeedsByStatus(needs,'active').some(item=>item.id==='n1'),false);
  assert.equal(filterNeedsByStatus(needs,'archived').find(item=>item.id==='n1').status,'archived');
  assert.equal(filterNeedsByStatus(needs,'all').length,2);
  assert.equal(needs.find(item=>item.id==='n1').status,'archived');
  assert.equal((await student.listMyRequests())[0].request.status,'cancelled');
  assert.equal(store.requests.length,1);
  await assert.rejects(student.createRequest('n2','l1'),{code:'INCOMPATIBLE'});
});

test('demo archive releases expired reservations once; matching excludes lifecycle states', async () => {
  const {student,business,advance}=await setup();
  const r=await student.createRequest('n1','l1'); await business.approveRequest(r.id); advance();
  await student.archiveNeed('n1'); await student.archiveNeed('n1');
  const l=(await business.listMyListings())[0]; assert.equal(l.quantityReserved,0);
  await assert.rejects(student.createRequest('n1','l1'),{code:'INCOMPATIBLE'});
  const { matchListing }=require('../src/features/student/matching.ts');
  assert.equal(matchListing({...need,status:'archived'},listing,'2030-01-01').eligible,false);
  assert.equal(matchListing(need,{...listing,status:'closed'},'2030-01-01').eligible,false);
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

test('need filters, counts, read-only state, empty panels and related request links stay consistent', async () => {
  const {
    filterNeedsByStatus,
    getNeedListCounts,
    getNeedListEmptyState,
    needIsReadOnly,
    requestsForNeed,
  } = require('../src/features/student/need-list.ts');
  const needs = [
    { ...need, quantity: 3 },
    { ...need, id: 'archived', status: 'archived', quantity: 7 },
  ];
  assert.deepEqual(getNeedListCounts(needs), {
    active: 1,
    archived: 1,
    activeQuantity: 3,
    total: 2,
  });
  assert.deepEqual(
    filterNeedsByStatus(needs, 'active').map((item) => item.id),
    ['n1'],
  );
  assert.deepEqual(
    filterNeedsByStatus(needs, 'archived').map((item) => item.id),
    ['archived'],
  );
  assert.equal(needIsReadOnly(needs[1]), true);
  assert.equal(needIsReadOnly(needs[0]), false);
  assert.deepEqual(
    getNeedListEmptyState('active', 2, false).action,
    'show-archived',
  );
  assert.deepEqual(
    getNeedListEmptyState('archived', 0, false).action,
    'create',
  );
  assert.deepEqual(
    getNeedListEmptyState('all', 2, true).action,
    'clear-search',
  );
  const requests = [
    { request: { id: 'r1', needId: 'n1' } },
    { request: { id: 'r2', needId: 'archived' } },
  ];
  assert.deepEqual(requestsForNeed(requests, 'archived'), [requests[1]]);

  const { student, store } = await setup();
  store.needs[0].status = 'archived';
  await assert.rejects(student.createRequest('n1', 'l1'), {
    code: 'INCOMPATIBLE',
  });
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
  assert.equal(
    require('../src/features/student/need-form.ts').firstNeedFormError(
      invalid.errors,
    ),
    'thicknessMm',
  );
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
  const form = { title: ' Workshop ', description: '', pickupInstructions: '',
    widthMm: '600,5', heightMm: '400', thicknessMm: '',
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
