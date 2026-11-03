import type { Listing, Need } from '@/types/domain';

export interface MatchResult {
  listing: Listing;
  score: number;
  reasons: string[];
  eligible: boolean;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

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

  if (widthGap && heightGap) {
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
    reasons.push('Kalınlık gereksinimi yok; doğrulama bekleniyor.');
  }

  const available = listing.quantityOnHand - listing.quantityReserved;
  if (available >= need.quantity) {
    score += 20;
    reasons.push('Kullanılabilir adet yeterli.');
  } else {
    reasons.push('Kullanılabilir adet ihtiyacı karşılamıyor.');
  }

  if (listing.region === need.region) {
    score += 10;
    reasons.push('Bölge aynı.');
  } else {
    reasons.push('Bölge farklı; teslim planı kontrol edilmeli.');
  }

  if (listing.pickupDeadline >= today) {
    score += 10;
    reasons.push('Son teslim tarihi uygun.');
  } else {
    reasons.push('Son teslim tarihi geçmiş.');
  }

  const eligible =
    listing.materialType === need.materialType &&
    listing.widthMm >= need.widthMm &&
    listing.heightMm >= need.heightMm &&
    (need.thicknessMm === null || listing.thicknessMm === need.thicknessMm) &&
    available >= need.quantity &&
    listing.pickupDeadline >= today;

  return { listing, score, reasons, eligible };
}

export function rankMatches(need: Need, listings: readonly Listing[], today = todayIso()): MatchResult[] {
  return listings
    .map((listing) => matchListing(need, listing, today))
    .sort((a, b) => b.score - a.score);
}
