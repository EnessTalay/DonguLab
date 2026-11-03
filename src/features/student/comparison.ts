import type { Listing, Need } from '@/types/domain';
import { materialLabels } from '@/lib/labels';
import { istanbulDate } from '@/lib/dates';

export type ComparisonFieldStatus = 'eligible' | 'missing' | 'ineligible';

export interface ComparisonField {
  id: 'material' | 'dimensions' | 'thickness' | 'quantity' | 'region' | 'deadline' | 'status';
  label: string;
  needValue: string;
  listingValue: string;
  status: ComparisonFieldStatus;
  statusLabel: 'Uygun' | 'Bilgi eksik' | 'Uygun değil';
  reason: string;
}

export interface NeedListingComparison {
  fields: ComparisonField[];
  overallStatus: ComparisonFieldStatus;
  canRequest: boolean;
  blockReason?: string;
}

const normalize = (value: string) =>
  value.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');

export function compareNeedWithListing(
  need: Need,
  listing: Listing,
  today: string = istanbulDate(),
): NeedListingComparison {
  const fields: ComparisonField[] = [];

  // 1. Malzeme türü
  if (!listing.materialType) {
    fields.push({
      id: 'material',
      label: 'Malzeme türü',
      needValue: materialLabels[need.materialType],
      listingValue: 'Belirtilmemiş',
      status: 'missing',
      statusLabel: 'Bilgi eksik',
      reason: 'İlanda malzeme türü belirtilmemiş.',
    });
  } else if (listing.materialType === need.materialType) {
    fields.push({
      id: 'material',
      label: 'Malzeme türü',
      needValue: materialLabels[need.materialType],
      listingValue: materialLabels[listing.materialType],
      status: 'eligible',
      statusLabel: 'Uygun',
      reason: 'Malzeme türü tam eşleşiyor.',
    });
  } else {
    fields.push({
      id: 'material',
      label: 'Malzeme türü',
      needValue: materialLabels[need.materialType],
      listingValue: materialLabels[listing.materialType],
      status: 'ineligible',
      statusLabel: 'Uygun değil',
      reason: `İlan malzemesi (${materialLabels[listing.materialType]}) ihtiyaçla (${materialLabels[need.materialType]}) uyuşmuyor.`,
    });
  }

  // 2. Ölçüler (döndürme dahil)
  const needDimensions = `${need.widthMm} × ${need.heightMm} mm`;
  const listingDimensions = `${listing.widthMm} × ${listing.heightMm} mm`;
  const directFit =
    listing.widthMm >= need.widthMm && listing.heightMm >= need.heightMm;
  const rotatedFit =
    listing.widthMm >= need.heightMm && listing.heightMm >= need.widthMm;

  if (!listing.widthMm || !listing.heightMm) {
    fields.push({
      id: 'dimensions',
      label: 'Ölçüler (en × boy)',
      needValue: needDimensions,
      listingValue: listingDimensions,
      status: 'missing',
      statusLabel: 'Bilgi eksik',
      reason: 'İlan ölçü bilgisi eksik veya geçersiz.',
    });
  } else if (directFit) {
    fields.push({
      id: 'dimensions',
      label: 'Ölçüler (en × boy)',
      needValue: needDimensions,
      listingValue: listingDimensions,
      status: 'eligible',
      statusLabel: 'Uygun',
      reason: 'İlan ölçüleri ihtiyaçtan büyük veya eşit.',
    });
  } else if (rotatedFit) {
    fields.push({
      id: 'dimensions',
      label: 'Ölçüler (en × boy)',
      needValue: needDimensions,
      listingValue: listingDimensions,
      status: 'eligible',
      statusLabel: 'Uygun',
      reason: 'İlan 90° döndürülerek ihtiyaç ölçüsünü karşılıyor.',
    });
  } else {
    fields.push({
      id: 'dimensions',
      label: 'Ölçüler (en × boy)',
      needValue: needDimensions,
      listingValue: listingDimensions,
      status: 'ineligible',
      statusLabel: 'Uygun değil',
      reason: 'İlan ölçüleri ihtiyaç duyulan parçayı çıkarmak için yetersiz.',
    });
  }

  // 3. Kalınlık
  const needThickness =
    need.thicknessMm !== null ? `${need.thicknessMm} mm` : 'Belirtilmemiş';
  const listingThickness =
    listing.thicknessMm !== null ? `${listing.thicknessMm} mm` : 'Belirtilmemiş';

  if (listing.thicknessMm === null) {
    fields.push({
      id: 'thickness',
      label: 'Kalınlık',
      needValue: needThickness,
      listingValue: listingThickness,
      status: 'missing',
      statusLabel: 'Bilgi eksik',
      reason: 'İlanda kalınlık belirtilmemiş; talep oluşturulamaz.',
    });
  } else if (need.thicknessMm === null) {
    fields.push({
      id: 'thickness',
      label: 'Kalınlık',
      needValue: needThickness,
      listingValue: listingThickness,
      status: 'missing',
      statusLabel: 'Bilgi eksik',
      reason: 'İhtiyaç kalınlığı belirtilmediği için eşleşme doğrulanamıyor.',
    });
  } else if (listing.thicknessMm === need.thicknessMm) {
    fields.push({
      id: 'thickness',
      label: 'Kalınlık',
      needValue: needThickness,
      listingValue: listingThickness,
      status: 'eligible',
      statusLabel: 'Uygun',
      reason: 'Kalınlık tam eşleşiyor.',
    });
  } else {
    fields.push({
      id: 'thickness',
      label: 'Kalınlık',
      needValue: needThickness,
      listingValue: listingThickness,
      status: 'ineligible',
      statusLabel: 'Uygun değil',
      reason: `İlan kalınlığı (${listing.thicknessMm} mm) istenen kalınlıktan (${need.thicknessMm} mm) farklı.`,
    });
  }

  // 4. Miktar / Kullanılabilir Stok
  const availableStock = listing.quantityOnHand - listing.quantityReserved;
  const needQty = `${need.quantity} adet`;
  const listingQty = `${availableStock} adet kullanılabilir (toplam: ${listing.quantityOnHand})`;

  if (availableStock >= need.quantity) {
    fields.push({
      id: 'quantity',
      label: 'Miktar / Stok',
      needValue: needQty,
      listingValue: listingQty,
      status: 'eligible',
      statusLabel: 'Uygun',
      reason: `Kullanılabilir stok (${availableStock} adet) istenen miktarı (${need.quantity} adet) karşılıyor.`,
    });
  } else if (availableStock > 0) {
    fields.push({
      id: 'quantity',
      label: 'Miktar / Stok',
      needValue: needQty,
      listingValue: listingQty,
      status: 'ineligible',
      statusLabel: 'Uygun değil',
      reason: `Kullanılabilir stok (${availableStock} adet) istenen miktarın (${need.quantity} adet) altında.`,
    });
  } else {
    fields.push({
      id: 'quantity',
      label: 'Miktar / Stok',
      needValue: needQty,
      listingValue: '0 adet kullanılabilir',
      status: 'ineligible',
      statusLabel: 'Uygun değil',
      reason: 'İlanda kullanılabilir stok tükenmiş.',
    });
  }

  // 5. Bölge
  if (!listing.region || !listing.region.trim()) {
    fields.push({
      id: 'region',
      label: 'Bölge',
      needValue: need.region,
      listingValue: 'Belirtilmemiş',
      status: 'missing',
      statusLabel: 'Bilgi eksik',
      reason: 'İlanda bölge bilgisi belirtilmemiş.',
    });
  } else if (normalize(listing.region) === normalize(need.region)) {
    fields.push({
      id: 'region',
      label: 'Bölge',
      needValue: need.region,
      listingValue: listing.region,
      status: 'eligible',
      statusLabel: 'Uygun',
      reason: 'Bölge eşleşiyor.',
    });
  } else {
    fields.push({
      id: 'region',
      label: 'Bölge',
      needValue: need.region,
      listingValue: listing.region,
      status: 'ineligible',
      statusLabel: 'Uygun değil',
      reason: `İlan bölgesi (${listing.region}) ihtiyaç bölgesinden (${need.region}) farklı.`,
    });
  }

  // 6. Tarih
  if (!listing.pickupDeadline) {
    fields.push({
      id: 'deadline',
      label: 'Son teslim tarihi',
      needValue: need.neededBy,
      listingValue: 'Belirtilmemiş',
      status: 'missing',
      statusLabel: 'Bilgi eksik',
      reason: 'İlanda son teslim alma tarihi belirtilmemiş.',
    });
  } else if (listing.pickupDeadline < today) {
    fields.push({
      id: 'deadline',
      label: 'Son teslim tarihi',
      needValue: need.neededBy,
      listingValue: listing.pickupDeadline,
      status: 'ineligible',
      statusLabel: 'Uygun değil',
      reason: 'İlanın son teslim alma tarihi geçmiş.',
    });
  } else {
    fields.push({
      id: 'deadline',
      label: 'Son teslim tarihi',
      needValue: need.neededBy,
      listingValue: listing.pickupDeadline,
      status: 'eligible',
      statusLabel: 'Uygun',
      reason: 'Son teslim alma tarihi uygun.',
    });
  }

  // 7. İlan Durumu
  if (listing.status !== 'active') {
    fields.push({
      id: 'status',
      label: 'İlan durumu',
      needValue: need.status === 'active' ? 'Aktif' : 'Arşivlenmiş',
      listingValue: 'Kapalı',
      status: 'ineligible',
      statusLabel: 'Uygun değil',
      reason: 'İlan işletme tarafından kapatılmış; yeni talep kabul etmiyor.',
    });
  }

  const hasMissing = fields.some((f) => f.status === 'missing');
  const hasIneligible = fields.some((f) => f.status === 'ineligible');
  const needActive = need.status === 'active';

  const overallStatus: ComparisonFieldStatus = hasIneligible
    ? 'ineligible'
    : hasMissing
      ? 'missing'
      : needActive
        ? 'eligible'
        : 'ineligible';

  const canRequest = overallStatus === 'eligible' && needActive;

  let blockReason: string | undefined;
  if (!needActive) {
    blockReason = 'Arşivlenmiş ihtiyaç için talep oluşturulamaz.';
  } else if (hasIneligible) {
    const firstIneligible = fields.find((f) => f.status === 'ineligible');
    blockReason = firstIneligible?.reason ?? 'İlan gereksinimleri karşılamıyor.';
  } else if (hasMissing) {
    const firstMissing = fields.find((f) => f.status === 'missing');
    blockReason = firstMissing?.reason ?? 'İlanda eksik bilgiler bulunuyor.';
  }

  return {
    fields,
    overallStatus,
    canRequest,
    blockReason,
  };
}
