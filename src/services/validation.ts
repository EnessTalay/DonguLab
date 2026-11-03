import type { Listing, MaterialSpec, Need } from '../types/domain';
import { AppError, type CreateListingInput, type CreateNeedInput } from './contracts';

import { validDate } from '../lib/dates';
export { istanbulDate, validDate } from '../lib/dates';

function material(input: MaterialSpec) {
  if (!['wood', 'metal', 'plastic'].includes(input.materialType) ||
    ![input.widthMm, input.heightMm].every(n => typeof n === 'number' && Number.isFinite(n) && n > 0 && n < 1e9) ||
    (input.thicknessMm !== null && !(typeof input.thicknessMm === 'number' && Number.isFinite(input.thicknessMm) && input.thicknessMm > 0 && input.thicknessMm < 1e9)) ||
    typeof input.region !== 'string' || !input.region.trim() || input.region.trim().length > 120) {
    throw new AppError('VALIDATION', 'Malzeme, ölçü, kalınlık ve bölge bilgilerini kontrol edin.');
  }
}
export function validateListing(input: CreateListingInput, today: string) {
  material(input);
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 200 ||
    !Number.isSafeInteger(input.quantityOnHand) || input.quantityOnHand <= 0 || input.quantityOnHand > 2147483647 ||
    !validDate(input.pickupDeadline) || input.pickupDeadline < today) {
    throw new AppError('VALIDATION', 'İlan başlığı, adet ve son teslim tarihini kontrol edin.');
  }
}
export function validateNeed(input: CreateNeedInput, today: string) {
  material(input);
  if (typeof input.projectName !== 'string' || !input.projectName.trim() || input.projectName.trim().length > 200 ||
    !Number.isSafeInteger(input.quantity) || input.quantity <= 0 || input.quantity > 2147483647 ||
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
