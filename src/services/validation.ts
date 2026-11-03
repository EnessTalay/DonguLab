import type { Listing, MaterialSpec, Need } from '../types/domain';
import { AppError, type CreateListingInput, type CreateNeedInput } from './contracts';

export const istanbulDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now);

export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function material(input: MaterialSpec) {
  if (!['wood', 'metal', 'plastic'].includes(input.materialType) ||
    ![input.widthMm, input.heightMm].every(n => typeof n === 'number' && Number.isFinite(n) && n > 0) ||
    (input.thicknessMm !== null && !(typeof input.thicknessMm === 'number' && Number.isFinite(input.thicknessMm) && input.thicknessMm > 0)) ||
    typeof input.region !== 'string' || !input.region.trim()) {
    throw new AppError('VALIDATION', 'Malzeme, ölçü, kalınlık ve bölge bilgilerini kontrol edin.');
  }
}
export function validateListing(input: CreateListingInput, today: string) {
  material(input);
  if (typeof input.title !== 'string' || !input.title.trim() ||
    !Number.isSafeInteger(input.quantityOnHand) || input.quantityOnHand <= 0 ||
    !validDate(input.pickupDeadline) || input.pickupDeadline < today) {
    throw new AppError('VALIDATION', 'İlan başlığı, adet ve son teslim tarihini kontrol edin.');
  }
}
export function validateNeed(input: CreateNeedInput, today: string) {
  material(input);
  if (typeof input.projectName !== 'string' || !input.projectName.trim() ||
    !Number.isSafeInteger(input.quantity) || input.quantity <= 0 ||
    input.thicknessMm === null || !validDate(input.neededBy) || input.neededBy < today) {
    throw new AppError('VALIDATION', 'Proje adı, kalınlık, adet ve ihtiyaç tarihini kontrol edin.');
  }
}

// Transaction guard for the demo adapter, NOT the UI matching/ranking engine.
// SQL enforces the same baseline. Emine owns src/matching and its explanations.
export function assertRequestEligible(need: Need, listing: Listing, today: string) {
  validateNeed(need, today);
  validateListing(listing, today);
  const normalize = (s: string) => s.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
  if (need.materialType !== listing.materialType || listing.thicknessMm === null ||
    need.thicknessMm !== listing.thicknessMm || normalize(need.region) !== normalize(listing.region) ||
    !((listing.widthMm >= need.widthMm && listing.heightMm >= need.heightMm) ||
      (listing.widthMm >= need.heightMm && listing.heightMm >= need.widthMm))) {
    throw new AppError('INCOMPATIBLE', 'İlan bu ihtiyacın malzeme, ölçü, kalınlık veya bölge koşullarını karşılamıyor.');
  }
  if (listing.quantityOnHand - listing.quantityReserved < need.quantity) {
    throw new AppError('OUT_OF_STOCK', 'Yeterli kullanılabilir stok kalmadı.');
  }
}
