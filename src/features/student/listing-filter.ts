import type { Listing, MaterialType, Need } from '@/types/domain';
import { materialLabels } from '@/lib/labels';
import { matchListing } from './matching';
import { istanbulDate } from '@/lib/dates';

export interface ListingFilterState {
  query: string;
  material: 'all' | MaterialType;
  region: string;
  eligibility: 'all' | 'eligible';
}

export const defaultListingFilters: ListingFilterState = {
  query: '',
  material: 'all',
  region: 'all',
  eligibility: 'eligible',
};

const normalize = (value: string) =>
  value.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');

export function getAvailableRegions(listings: readonly Listing[]): string[] {
  const map = new Map<string, string>();
  for (const listing of listings) {
    const raw = listing.region.trim();
    if (raw) {
      const key = normalize(raw);
      if (!map.has(key)) {
        map.set(key, raw);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'tr-TR'));
}

export function filterListings(
  listings: readonly Listing[],
  options: {
    filters: ListingFilterState;
    need?: Need | null;
    today?: string;
  },
): Listing[] {
  const { filters, need, today = istanbulDate() } = options;
  const normalizedQuery = normalize(filters.query);

  return listings.filter((listing) => {
    // 1. Material filter
    if (filters.material !== 'all' && listing.materialType !== filters.material) {
      return false;
    }

    // 2. Region filter
    if (
      filters.region !== 'all' &&
      normalize(listing.region) !== normalize(filters.region)
    ) {
      return false;
    }

    // 3. Search query
    if (normalizedQuery.length > 0) {
      const materialText = materialLabels[listing.materialType] ?? '';
      const haystack = normalize(
        `${listing.title} ${listing.description ?? ''} ${listing.region} ${materialText} ${listing.pickupInstructions ?? ''}`,
      );
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }

    // 4. Eligibility filter (if need is provided)
    if (filters.eligibility === 'eligible' && need) {
      const result = matchListing(need, listing, today);
      if (!result.eligible) {
        return false;
      }
    }

    return true;
  });
}

export interface ListingEmptyStateInfo {
  title: string;
  message: string;
  actionLabel: string;
  actionType: 'clear-query' | 'clear-filters' | 'view-all-eligibility' | 'back';
}

export function getListingEmptyState(
  filters: ListingFilterState,
  totalCount: number,
  filteredCount: number,
): ListingEmptyStateInfo {
  if (totalCount === 0) {
    return {
      title: 'Henüz ilan bulunmuyor',
      message: 'İşletmeler malzeme ilanı açtığında burada görebileceksin.',
      actionLabel: 'İhtiyaçlarıma dön',
      actionType: 'back',
    };
  }

  if (filteredCount === 0) {
    const hasQuery = filters.query.trim().length > 0;
    const hasCategory =
      filters.material !== 'all' || filters.region !== 'all';

    if (hasQuery) {
      return {
        title: 'Aramanıza uygun ilan bulunamadı',
        message: 'Farklı bir arama terimi deneyebilir veya arama kutusunu temizleyebilirsiniz.',
        actionLabel: 'Aramayı temizle',
        actionType: 'clear-query',
      };
    }

    if (hasCategory) {
      return {
        title: 'Seçili filtrelere uygun ilan bulunamadı',
        message: 'Filtreleri sıfırlayarak daha fazla ilan görüntüleyebilirsiniz.',
        actionLabel: 'Filtreleri sıfırla',
        actionType: 'clear-filters',
      };
    }

    if (filters.eligibility === 'eligible') {
      return {
        title: 'Şu an uygun ilan bulunamadı',
        message: 'İhtiyacınızı tam karşılayan ilan bulunmuyor. Nedenlerini görmek için tüm ilanları inceleyebilirsiniz.',
        actionLabel: 'Tüm ilanları göster',
        actionType: 'view-all-eligibility',
      };
    }

    return {
      title: 'İlan bulunamadı',
      message: 'Kriterlerinize uygun ilan bulunmuyor.',
      actionLabel: 'Filtreleri sıfırla',
      actionType: 'clear-filters',
    };
  }

  return {
    title: '',
    message: '',
    actionLabel: '',
    actionType: 'clear-filters',
  };
}
