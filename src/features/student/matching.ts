import type { Listing, Need } from '../../types/domain';
import { assertRequestEligible, istanbulDate } from '../../services/validation';

export interface MatchResult {
  listing: Listing;
  score: number;
  reasons: string[];
  eligible: boolean;
}

const todayIso = () => istanbulDate();

export function matchListing(need: Need, listing: Listing, today = todayIso()): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  if (listing.materialType !== need.materialType) {
    return {
      listing,
      score: -100,
      reasons: ['Malzeme türü eşleşmiyor.'],
      eligible: false,
    };
  }

  score += 30;
  reasons.push('Malzeme eşleşiyor.');

  const widthGap = listing.widthMm >= need.widthMm ? 1 : 0;
  const heightGap = listing.heightMm >= need.heightMm ? 1 : 0;

  if ((widthGap && heightGap) || (listing.widthMm >= need.heightMm && listing.heightMm >= need.widthMm)) {
    score += 25;
    reasons.push('Ölçüler ihtiyaçtan büyük veya eşit.');
  } else {
    reasons.push('Ölçüler ihtiyaç seviyesini karşılamıyor.');
  }

  if (need.thicknessMm !== null) {
    if (listing.thicknessMm === null) {
      reasons.push('Kalınlık doğrulanamadığı için uygun değil.');
      return { listing, score: -20, reasons, eligible: false };
    }

    if (listing.thicknessMm === need.thicknessMm) {
      score += 25;
      reasons.push('Kalınlık tam eşleşiyor.');
    } else {
      reasons.push('Kalınlık tam eşleşmiyor.');
    }
  } else {
    reasons.push('Eşleşme için ihtiyaç kalınlığı belirtilmelidir.');
  }

  const available = listing.quantityOnHand - listing.quantityReserved;
  if (available >= need.quantity) {
    score += 20;
    reasons.push('Kullanılabilir adet yeterli.');
  } else {
    reasons.push('Kullanılabilir adet ihtiyacı karşılamıyor.');
  }

  if (listing.region.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ') === need.region.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ')) {
    score += 10;
    reasons.push('Bölge aynı.');
  } else {
    reasons.push('Bölge farklı olduğu için talep gönderilemez.');
  }

  if (listing.pickupDeadline >= today) {
    score += 10;
    reasons.push('Son teslim tarihi uygun.');
  } else {
    reasons.push('Son teslim tarihi geçmiş.');
  }

  let eligible = true;
  try {
    assertRequestEligible(need, listing, today);
  } catch (error) {
    eligible = false;
    reasons.push(error instanceof Error ? error.message : 'İlan uygun değil.');
  }

  return { listing, score, reasons, eligible };
}

export function rankMatches(need: Need, listings: readonly Listing[], today = todayIso()): MatchResult[] {
  return listings
    .map((listing) => matchListing(need, listing, today))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || a.listing.title.localeCompare(b.listing.title, 'tr'));
}
