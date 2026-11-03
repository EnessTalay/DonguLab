import { demoListings, demoNeed } from '@/services/demo';
import type { MaterialRequest, Need, RequestStatus } from '@/types/domain';
import { rankMatches } from '@/features/student/matching';

export type NeedInput = Omit<Need, 'id' | 'studentId'> & {
  studentId?: string;
};

export interface StudentRequestView {
  request: MaterialRequest;
  listingTitle: string;
  projectName: string;
  statusLabel: string;
}

const defaultStudentId = 'demo-student';
const needsStore: Need[] = [demoNeed];
const requestsStore: MaterialRequest[] = [];
const deliveryCodes: Record<string, { code: string; expiresAt: string }> = {};

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const toDisplayStatus = (status: RequestStatus): string => {
  const labels: Record<RequestStatus, string> = {
    pending: 'Bekliyor',
    approved: 'Onaylandı',
    rejected: 'Reddedildi',
    cancelled: 'İptal Edildi',
    delivered: 'Teslim Edildi',
  };

  return labels[status];
};

export const studentDemoService = {
  async createNeed(input: NeedInput): Promise<Need> {
    const need: Need = {
      ...input,
      id: makeId('need'),
      studentId: input.studentId ?? defaultStudentId,
    };

    needsStore.unshift(need);
    return need;
  },

  async listMyNeeds(): Promise<readonly Need[]> {
    return [...needsStore];
  },

  async getNeed(needId: string): Promise<Need | undefined> {
    return needsStore.find((need) => need.id === needId);
  },

  async listMatches(needId: string) {
    const need = await this.getNeed(needId);
    if (!need) return [];

    return rankMatches(need, demoListings, new Date().toISOString().slice(0, 10));
  },

  async createRequest(needId: string, listingId: string, quantity: number): Promise<MaterialRequest> {
    const request: MaterialRequest = {
      id: makeId('request'),
      needId,
      listingId,
      studentId: defaultStudentId,
      quantity,
      status: 'pending',
    };

    requestsStore.unshift(request);
    return request;
  },

  async listMyRequests(): Promise<StudentRequestView[]> {
    return requestsStore.map((request) => {
      const listing = demoListings.find((item) => item.id === request.listingId) ?? null;
      const need = needsStore.find((item) => item.id === request.needId) ?? null;

      return {
        request,
        listingTitle: listing?.title ?? 'İlan bulunamadı',
        projectName: need?.projectName ?? 'İhtiyaç bulunamadı',
        statusLabel: toDisplayStatus(request.status),
      };
    });
  },

  async issueDeliveryCode(requestId: string): Promise<{ code: string; expiresAt: string }> {
    const request = requestsStore.find((item) => item.id === requestId);
    if (!request || request.status !== 'approved') {
      throw new Error('Onaylı talep için teslim kodu oluşturulabilir.');
    }

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    const code = `${Math.random().toString().slice(2, 8).padStart(6, '0')}`;
    deliveryCodes[requestId] = { code, expiresAt };

    return { code, expiresAt };
  },

  async cancelRequest(requestId: string): Promise<MaterialRequest> {
    const request = requestsStore.find((item) => item.id === requestId);
    if (!request) {
      throw new Error('Talep bulunamadı.');
    }

    request.status = 'cancelled';
    delete deliveryCodes[requestId];
    return request;
  },

  async getDeliveryCode(requestId: string): Promise<{ code: string; expiresAt: string } | null> {
    return deliveryCodes[requestId] ?? null;
  },
};

export type StudentMockService = typeof studentDemoService;
