import type { Listing, MaterialRequest, Need } from '../types/domain';
import { AppError, type AppServices, type AppSession, type Profile } from './contracts';
import { assertRequestEligible, istanbulDate, validateListing, validateNeed } from './validation';

type StoredRequest = MaterialRequest & { expiresAt: string | null; code?: string; attempts: number; issues: number };
export interface DemoStore {
  listings: Listing[];
  needs: Need[];
  requests: StoredRequest[];
  sequence: number;
}
export const demoAccounts = [
  { email: 'ogrenci@demo.local', password: 'Demo123!', profile: { id: 'demo-student', role: 'student', displayName: 'Demo Öğrenci' } },
  { email: 'isletme@demo.local', password: 'Demo123!', profile: { id: 'demo-business', role: 'business', displayName: 'Demo İşletme' } },
] as const;
export function createDemoStore(listings: readonly Listing[] = [], needs: readonly Need[] = []): DemoStore {
  // Independent test/demo state, never mutate exported fixture objects.
  return { listings: copy([...listings]), needs: copy([...needs]), requests: [], sequence: 0 };
}
// All service DTOs contain only JSON values; also works in Expo Go's Hermes runtime.
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export function createDemoServices(store: DemoStore, clock = () => new Date()): AppServices {
  let profile: Profile | null = null;
  const listeners = new Set<(session: AppSession | null) => void>();
  const session = (): AppSession | null => profile ? { profile: copy(profile) } : null;
  const notify = () => listeners.forEach(listener => listener(session()));
  const user = (role?: Profile['role']) => {
    if (!profile) throw new AppError('UNAUTHENTICATED', 'Önce giriş yapın.');
    if (role && role !== profile.role) throw new AppError('FORBIDDEN', 'Bu işlem için yetkiniz yok.');
    return profile;
  };
  const id = () => `demo-${++store.sequence}`;
  function expire() {
    for (const req of store.requests) {
      if (req.status === 'approved' && req.expiresAt && new Date(req.expiresAt) <= clock()) {
        const listing = store.listings.find(x => x.id === req.listingId)!;
        listing.quantityReserved -= req.quantity;
        req.status = 'cancelled';
        delete req.code;
      }
    }
  }
  function ownedRequest(requestId: string, side: 'student' | 'business') {
    const actor = user(side);
    const req = store.requests.find(x => x.id === requestId);
    const listing = req && store.listings.find(x => x.id === req.listingId);
    if (!req || !listing) throw new AppError('NOT_FOUND', 'Talep bulunamadı.');
    if (side === 'student' ? req.studentId !== actor.id : listing.businessId !== actor.id) {
      throw new AppError('FORBIDDEN', 'Bu talep size ait değil.');
    }
    return { req, listing };
  }
  const publicRequest = (req: StoredRequest): MaterialRequest => ({
    id: req.id, needId: req.needId, listingId: req.listingId, studentId: req.studentId,
    quantity: req.quantity, status: req.status,
  });
  function views(side: 'student' | 'business') {
    const actor = user(side); expire();
    return store.requests.filter(req => side === 'student' ? req.studentId === actor.id :
      store.listings.some(l => l.id === req.listingId && l.businessId === actor.id)).map(req => ({
      request: publicRequest(req), listingTitle: store.listings.find(l => l.id === req.listingId)!.title,
      projectName: store.needs.find(n => n.id === req.needId)!.projectName, expiresAt: req.expiresAt,
    }));
  }
  return {
    mode: 'demo',
    async signIn(email, password) {
      const account = demoAccounts.find(a => a.email === email.trim().toLowerCase() && a.password === password);
      if (!account) throw new AppError('UNAUTHENTICATED', 'Demo e-posta veya parola yanlış.');
      profile = { ...account.profile }; notify(); return session()!;
    },
    async signOut() { profile = null; notify(); },
    async getSession() { return session(); },
    onAuthStateChange(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async listListings() { user(); expire(); return copy(store.listings); },
    async listMyListings() { const actor = user('business'); expire(); return copy(store.listings.filter(l => l.businessId === actor.id)); },
    async createListing(input) {
      const actor = user('business'); validateListing(input, istanbulDate(clock()));
      // Whitelist fields: malicious runtime input cannot set owner or reservations.
      const listing: Listing = { id: id(), businessId: actor.id, title: input.title.trim(),
        materialType: input.materialType, widthMm: input.widthMm, heightMm: input.heightMm,
        thicknessMm: input.thicknessMm, region: input.region.trim(), pickupDeadline: input.pickupDeadline,
        quantityOnHand: input.quantityOnHand, quantityReserved: 0 };
      store.listings.push(listing); return copy(listing);
    },
    async createNeed(input) {
      const actor = user('student'); validateNeed(input, istanbulDate(clock()));
      const need: Need = { id: id(), studentId: actor.id, projectName: input.projectName.trim(),
        materialType: input.materialType, widthMm: input.widthMm, heightMm: input.heightMm,
        thicknessMm: input.thicknessMm, region: input.region.trim(), neededBy: input.neededBy, quantity: input.quantity };
      store.needs.push(need); return copy(need);
    },
    async listMyNeeds() { const actor = user('student'); return copy(store.needs.filter(n => n.studentId === actor.id)); },
    async createRequest(needId, listingId) {
      const actor = user('student'); expire();
      const need = store.needs.find(n => n.id === needId && n.studentId === actor.id);
      const listing = store.listings.find(l => l.id === listingId);
      if (!need || !listing) throw new AppError('NOT_FOUND', 'İhtiyaç veya ilan bulunamadı.');
      const active = store.requests.find(r => r.needId === needId && ['pending', 'approved', 'delivered'].includes(r.status));
      if (active) {
        if (active.listingId === listingId) return publicRequest(active);
        throw new AppError('CONFLICT', 'Bu ihtiyaç için zaten bir talep var.');
      }
      assertRequestEligible(need, listing, istanbulDate(clock()));
      const req: StoredRequest = { id: id(), needId, listingId, studentId: actor.id, quantity: need.quantity,
        status: 'pending', expiresAt: null, attempts: 0, issues: 0 };
      store.requests.push(req); return publicRequest(req);
    },
    async listMyRequests() { return views('student'); },
    async listIncomingRequests() { return views('business'); },
    async approveRequest(requestId) {
      expire(); const { req, listing } = ownedRequest(requestId, 'business');
      if (req.status === 'approved' || req.status === 'delivered') return publicRequest(req);
      if (req.status !== 'pending') throw new AppError('CONFLICT', 'Bu talep onaylanamaz.');
      const need = store.needs.find(n => n.id === req.needId)!;
      assertRequestEligible(need, listing, istanbulDate(clock()));
      req.expiresAt = new Date(Math.min(clock().getTime() + 2 * 3600000,
        new Date(`${listing.pickupDeadline}T23:59:59.999+03:00`).getTime(),
        new Date(`${need.neededBy}T23:59:59.999+03:00`).getTime())).toISOString();
      listing.quantityReserved += req.quantity; req.status = 'approved'; return publicRequest(req);
    },
    async rejectRequest(requestId) {
      const { req } = ownedRequest(requestId, 'business');
      if (req.status === 'rejected') return publicRequest(req);
      if (req.status !== 'pending') throw new AppError('CONFLICT', 'Yalnız bekleyen talep reddedilebilir.');
      req.status = 'rejected'; return publicRequest(req);
    },
    async cancelRequest(requestId) {
      expire(); const { req, listing } = ownedRequest(requestId, 'student');
      if (req.status === 'cancelled') return publicRequest(req);
      if (!['pending', 'approved'].includes(req.status)) throw new AppError('CONFLICT', 'Bu talep iptal edilemez.');
      if (req.status === 'approved') listing.quantityReserved -= req.quantity;
      req.status = 'cancelled'; delete req.code; return publicRequest(req);
    },
    async issueDeliveryCode(requestId) {
      expire(); const { req } = ownedRequest(requestId, 'student');
      if (req.status !== 'approved') throw new AppError('CONFLICT', 'Talep aktif bir onay taşımıyor.');
      if (req.attempts >= 5 || req.issues >= 10) throw new AppError('TOO_MANY_ATTEMPTS', 'Kod işlem sınırına ulaşıldı.');
      // Intentionally local demo only. Production code is generated and hashed in SQL.
      req.code = String(100000 + (++store.sequence % 900000)); req.issues++;
      return { code: req.code, expiresAt: req.expiresAt! };
    },
    async confirmDelivery(requestId, code) {
      expire(); const { req, listing } = ownedRequest(requestId, 'business');
      if (req.status === 'delivered') return publicRequest(req);
      if (req.status !== 'approved') throw new AppError('CONFLICT', 'Talep teslim edilemez.');
      if (req.attempts >= 5) throw new AppError('TOO_MANY_ATTEMPTS', 'Yanlış kod deneme sınırına ulaşıldı.');
      if (!req.code || code !== req.code) { req.attempts++; throw new AppError('INVALID_CODE', 'Teslim kodu yanlış.'); }
      listing.quantityOnHand -= req.quantity; listing.quantityReserved -= req.quantity;
      req.status = 'delivered'; delete req.code; return publicRequest(req);
    },
  };
}
