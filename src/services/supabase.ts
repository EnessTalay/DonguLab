import type { SupabaseClient } from '@supabase/supabase-js';
import type { Listing, MaterialRequest, Need, Role } from '../types/domain';
import { AppError, type AppServices, type AppSession, type CreateListingInput, type CreateNeedInput, type DeliveryCode, type ErrorCode, type RequestView } from './contracts';
import { istanbulDate, validateListing, validateNeed } from './validation';

interface DbMaterial {
  material_type: Listing['materialType']; width_mm: number; height_mm: number;
  thickness_mm: number | null; region: string;
}
interface DbListing extends DbMaterial {
  status: Listing['status'];
  id: string; business_id: string; title: string; quantity_on_hand: number;
  quantity_reserved: number; pickup_deadline: string;
}
interface DbNeed extends DbMaterial {
  status: Need['status'];
  id: string; student_id: string; project_name: string; quantity: number; needed_by: string;
}
interface DbRequest {
  id: string; need_id: string; listing_id: string; student_id: string;
  quantity: number; status: MaterialRequest['status'];
}
const spec = (row: DbMaterial) => ({ materialType: row.material_type,
  widthMm: Number(row.width_mm), heightMm: Number(row.height_mm),
  thicknessMm: row.thickness_mm === null ? null : Number(row.thickness_mm), region: row.region });
export const mapListing = (row: DbListing): Listing => ({ ...spec(row), id: row.id,
  businessId: row.business_id, status: row.status, title: row.title, quantityOnHand: row.quantity_on_hand,
  quantityReserved: row.quantity_reserved, pickupDeadline: row.pickup_deadline });
export const mapNeed = (row: DbNeed): Need => ({ ...spec(row), id: row.id,
  studentId: row.student_id, status: row.status, projectName: row.project_name, quantity: row.quantity, neededBy: row.needed_by });
export const mapRequest = (row: DbRequest): MaterialRequest => ({ id: row.id,
  needId: row.need_id, listingId: row.listing_id, studentId: row.student_id, quantity: row.quantity, status: row.status });

function databaseError(error: { code?: string; message?: string; status?: number }): never {
  if (error.code === 'email_not_confirmed') throw new AppError('UNAUTHENTICATED', 'Önce e-posta adresinize gönderilen onay bağlantısını açın.');
  if (error.status === 429 || error.code === 'over_email_send_rate_limit') throw new AppError('TOO_MANY_ATTEMPTS', 'Çok fazla deneme yapıldı. Lütfen biraz bekleyin.');
  if (['weak_password', 'email_address_invalid', 'validation_failed'].includes(error.code ?? '')) throw new AppError('VALIDATION', 'Geçerli bir e-posta ve daha güçlü bir parola kullanın.');
  if (error.code === '42501') throw new AppError('FORBIDDEN', 'Bu işlem için yetkiniz yok.');
  if (['PGRST301','PGRST302','refresh_token_not_found','invalid_credentials'].includes(error.code ?? '') || error.status === 401) {
    throw new AppError('UNAUTHENTICATED', 'Oturum veya giriş bilgileri geçersiz. Yeniden giriş yapın.');
  }
  if (/fetch|network|offline/i.test(error.message ?? '')) throw new AppError('NETWORK', 'Bağlantı kurulamadı. Yeniden deneyin.');
  throw new AppError('UNKNOWN', 'İşlem tamamlanamadı. Bağlantıyı ve sunucu kurulumunu kontrol edin.');
}

export function createSupabaseServices(getClient: () => SupabaseClient): AppServices {
  async function getSession(): Promise<AppSession | null> {
    const client = getClient();
    const { data, error } = await client.auth.getSession();
    if (error) databaseError(error);
    if (!data.session) return null;
    const result = await client.from('profiles').select('id,role,display_name').eq('id', data.session.user.id).single();
    if (result.error) databaseError(result.error);
    const row = result.data as { id: string; role: Role; display_name: string };
    if (!['student', 'business'].includes(row.role)) throw new AppError('FORBIDDEN', 'Kullanıcı rolü geçersiz.');
    const displayName = row.display_name === 'Yeni kullanıcı' ? (data.session.user.email ?? row.display_name) : row.display_name;
    return { profile: { id: row.id, role: row.role, displayName } };
  }
  async function requireRole(role?: Role) {
    const session = await getSession();
    if (!session) throw new AppError('UNAUTHENTICATED', 'Önce giriş yapın.');
    if (role && session.profile.role !== role) throw new AppError('FORBIDDEN', 'Bu işlem için yetkiniz yok.');
    return session.profile;
  }
  async function rpc<T>(name: string, params?: Record<string, unknown>): Promise<T> {
    const { data, error } = await getClient().rpc(name, params);
    if (error) databaseError(error);
    const envelope = data as { ok: boolean; data: T; error?: { code: ErrorCode; message: string } };
    if (!envelope || typeof envelope.ok !== 'boolean') throw new AppError('UNKNOWN', 'Sunucu cevabı beklenen biçimde değil.');
    if (!envelope.ok) throw new AppError(envelope.error?.code ?? 'UNKNOWN', envelope.error?.message ?? 'İşlem başarısız.');
    return envelope.data;
  }
  const command = <T,>(action: string, payload: object) => rpc<T>('app_command', { p_action: action, p_payload: payload });
  const requestCommand = async (action: string, requestId: string, code?: string) =>
    mapRequest(await command<DbRequest>(action, { requestId, ...(code === undefined ? {} : { code }) }));
  async function refresh() {
    const { error } = await getClient().rpc('refresh_reservations');
    if (error) databaseError(error);
  }
  async function listRequests(side: Role): Promise<RequestView[]> {
    await requireRole(side);
    const rows = await rpc<{ request: DbRequest; listingTitle: string; projectName: string; expiresAt: string | null }[]>(
      'list_request_views', { p_side: side });
    return rows.map(row => ({ ...row, request: mapRequest(row.request) }));
  }
  return {
    mode: 'supabase',
    async signUp(email, password) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < 8) {
        throw new AppError('VALIDATION', 'Geçerli bir e-posta ve en az 8 karakterli parola girin.');
      }
      // No role metadata: the database creates students; businesses require admin approval.
      const { data, error } = await getClient().auth.signUp({ email: email.trim(), password });
      if (error) databaseError(error);
      return { confirmationRequired: !data.session };
    },
    async signIn(email, password) {
      const { error } = await getClient().auth.signInWithPassword({ email: email.trim(), password });
      if (error) databaseError(error);
      const session = await getSession();
      if (!session) throw new AppError('UNAUTHENTICATED', 'Oturum açılamadı.');
      return session;
    },
    async signOut() { const { error } = await getClient().auth.signOut(); if (error) databaseError(error); },
    getSession,
    onAuthStateChange(listener) {
      let disposed = false, generation = 0;
      const { data } = getClient().auth.onAuthStateChange((_event, authSession) => {
        const ticket = ++generation;
        if (!authSession) { listener(null); return; }
        // Never await another Supabase API inside its auth lock callback.
        setTimeout(() => {
          if (disposed || ticket !== generation) return;
          void getSession().then(s => { if (!disposed && ticket === generation) listener(s); })
            .catch(() => { if (!disposed && ticket === generation) listener(null); });
        }, 0);
      });
      return () => { disposed = true; generation++; data.subscription.unsubscribe(); };
    },
    async listListings() {
      await requireRole(); await refresh();
      const { data, error } = await getClient().from('listings').select('*').eq('status', 'active').order('created_at', { ascending: false });
      if (error) databaseError(error);
      return (data as DbListing[]).map(mapListing);
    },
    async listMyListings() {
      const actor = await requireRole('business'); await refresh();
      const { data, error } = await getClient().from('listings').select('*').eq('business_id', actor.id).order('created_at', { ascending: false });
      if (error) databaseError(error);
      return (data as DbListing[]).map(mapListing);
    },
    async createListing(input: CreateListingInput) {
      validateListing(input, istanbulDate());
      return mapListing(await command<DbListing>('create_listing', input));
    },
    async updateListing(id, input) {
      await requireRole('business'); validateListing(input, istanbulDate());
      return mapListing(await command<DbListing>('update_listing', { ...input, listingId: id }));
    },
    async closeListing(id) {
      await requireRole('business');
      return mapListing(await command<DbListing>('close_listing', { listingId: id }));
    },
    async updateNeed(id, input) {
      await requireRole('student'); validateNeed(input, istanbulDate());
      return mapNeed(await command<DbNeed>('update_need', { ...input, needId: id }));
    },
    async archiveNeed(id) {
      await requireRole('student');
      return mapNeed(await command<DbNeed>('archive_need', { needId: id }));
    },
    async createNeed(input: CreateNeedInput) {
      validateNeed(input, istanbulDate());
      return mapNeed(await command<DbNeed>('create_need', input));
    },
    async listMyNeeds() {
      const actor = await requireRole('student');
      const { data, error } = await getClient().from('needs').select('*').eq('student_id', actor.id).order('created_at', { ascending: false });
      if (error) databaseError(error);
      return (data as DbNeed[]).map(mapNeed);
    },
    async createRequest(needId, listingId) { return mapRequest(await command<DbRequest>('create_request', { needId, listingId })); },
    async listMyRequests() { return listRequests('student'); },
    async listIncomingRequests() { return listRequests('business'); },
    async approveRequest(id) { return requestCommand('approve_request', id); },
    async rejectRequest(id) { return requestCommand('reject_request', id); },
    async cancelRequest(id) { return requestCommand('cancel_request', id); },
    async issueDeliveryCode(requestId) { return command<DeliveryCode>('issue_delivery_code', { requestId }); },
    async confirmDelivery(id, code) { return requestCommand('confirm_delivery', id, code); },
  };
}
