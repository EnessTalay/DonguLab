import type { Need, NeedStatus } from '../../types/domain';

export type NeedListFilter = NeedStatus | 'all';

export interface NeedListCounts {
  active: number;
  archived: number;
  activeQuantity: number;
  total: number;
}

export function getNeedListCounts(needs: readonly Need[]): NeedListCounts {
  const active = needs.filter((need) => need.status === 'active');
  const archived = needs.filter((need) => need.status === 'archived');
  return {
    active: active.length,
    archived: archived.length,
    activeQuantity: active.reduce((total, need) => total + need.quantity, 0),
    total: needs.length,
  };
}

export function filterNeedsByStatus(
  needs: readonly Need[],
  filter: NeedListFilter,
): Need[] {
  return filter === 'all'
    ? [...needs]
    : needs.filter((need) => need.status === filter);
}

export function getNeedListEmptyState(
  filter: NeedListFilter,
  totalNeeds: number,
  hasQuery: boolean,
): {
  title: string;
  message: string;
  action: 'clear-search' | 'show-active' | 'show-archived' | 'create';
} {
  if (hasQuery) {
    return {
      title: 'Aramana uygun ihtiyaç yok',
      message: 'Başka bir proje adı veya bölge deneyebilirsin.',
      action: 'clear-search',
    };
  }
  if (filter === 'active' && totalNeeds > 0) {
    return {
      title: 'Aktif ihtiyaç yok',
      message:
        'Arşivlenen ihtiyaçlarını görmek için arşiv filtresini seçebilirsin.',
      action: 'show-archived',
    };
  }
  if (filter === 'archived' && totalNeeds > 0) {
    return {
      title: 'Arşivlenmiş ihtiyaç yok',
      message: 'Aktif ihtiyaçlarını görmek için aktif filtresini seçebilirsin.',
      action: 'show-active',
    };
  }
  if (filter === 'archived') {
    return {
      title: 'Arşivlenmiş ihtiyaç yok',
      message: 'Bir ihtiyacı tamamladığında geçmiş kayıtlarını burada bulursun.',
      action: 'create',
    };
  }
  return {
    title: 'İlk projenle başlayalım',
    message:
      'Ölçüleri girerek projen için uygun malzemeleri bulabilirsin.',
    action: 'create',
  };
}

export function requestsForNeed<T extends { request: { needId: string } }>(
  requests: readonly T[],
  needId: string,
): T[] {
  return requests.filter((item) => item.request.needId === needId);
}

export function needIsReadOnly(need: Pick<Need, 'status'>): boolean {
  return need.status === 'archived';
}

export function existingRequestForNeed<T extends { request: {
  listingId: string; needId: string; status: string;
} }>(requests: readonly T[], listingId: string, needId: string | null): T | undefined {
  if (!needId) return undefined;
  return requests.find(item => item.request.listingId === listingId && item.request.needId === needId &&
    ['pending', 'approved', 'delivered'].includes(item.request.status));
}
