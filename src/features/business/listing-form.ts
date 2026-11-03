import type { CreateListingInput } from '../../services/contracts';
import type { MaterialType } from '../../types/domain';
import { materialOptions } from '../../lib/labels';
import { parsePositiveNumber } from '../../lib/numbers';
import { isValidPickupDeadline } from './pickup-date';

export const emptyForm = {
  title: '',
  description: '',
  pickupInstructions: '',
  widthMm: '',
  heightMm: '',
  thicknessMm: '',
  quantityOnHand: '',
  region: '',
  pickupDeadline: '',
};

export type ListingDraft = typeof emptyForm;

export type ListingFormField = keyof typeof emptyForm | 'materialType';
export type ListingFormErrors = Partial<Record<ListingFormField, string>>;

export function parseListingForm(
  form: ListingDraft,
  materialType: MaterialType,
): { input: CreateListingInput | null; errors: ListingFormErrors } {
  const title = form.title.trim();
  const description = form.description.trim();
  const pickupInstructions = form.pickupInstructions.trim();
  const region = form.region.trim();
  const widthMm = parsePositiveNumber(form.widthMm);
  const heightMm = parsePositiveNumber(form.heightMm);
  const thicknessMm = form.thicknessMm.trim()
    ? parsePositiveNumber(form.thicknessMm)
    : null;
  const quantityOnHand = Number(form.quantityOnHand.trim());
  const errors: ListingFormErrors = {};

  if (!title || title.length > 200)
    errors.title = 'İlan başlığı 1–200 karakter olmalıdır.';
  if (description.length > 2000)
    errors.description = 'Açıklama en fazla 2000 karakter olabilir.';
  if (pickupInstructions.length > 1000)
    errors.pickupInstructions =
      'Teslim alma bilgisi en fazla 1000 karakter olabilir.';
  if (!materialOptions.some((option) => option.value === materialType)) {
    errors.materialType = 'Lütfen geçerli bir malzeme türü seçin.';
  }
  if (widthMm === null)
    errors.widthMm = 'Genişlik sıfırdan büyük bir sayı olmalıdır.';
  if (heightMm === null)
    errors.heightMm = 'Yükseklik sıfırdan büyük bir sayı olmalıdır.';
  if (form.thicknessMm.trim() && thicknessMm === null) {
    errors.thicknessMm =
      'Kalınlık sıfırdan büyük bir sayı olmalıdır veya boş bırakılmalıdır.';
  }
  if (
    !Number.isSafeInteger(quantityOnHand) ||
    quantityOnHand <= 0 ||
    quantityOnHand > 2147483647
  ) {
    errors.quantityOnHand = 'Stok miktarı pozitif bir tam sayı olmalıdır.';
  }
  if (!region || region.length > 120)
    errors.region = 'Bölge 1–120 karakter olmalıdır.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.pickupDeadline)) {
    errors.pickupDeadline =
      'Son teslim alma tarihini YYYY-AA-GG biçiminde girin.';
  } else if (!isValidPickupDeadline(form.pickupDeadline)) {
    errors.pickupDeadline = 'Bugün veya daha ileri bir tarih seçin.';
  }

  if (Object.keys(errors).length > 0 || widthMm === null || heightMm === null) {
    return { input: null, errors };
  }

  return {
    input: {
      title,
      description,
      pickupInstructions,
      materialType,
      widthMm,
      heightMm,
      thicknessMm,
      quantityOnHand,
      region,
      pickupDeadline: form.pickupDeadline,
    },
    errors,
  };
}
