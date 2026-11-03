import type { CreateNeedInput } from '../../services/contracts';
import type { Need } from '../../types/domain';
import { istanbulDate, validDate } from '../../lib/dates';
import { parseDecimalNumber, parsePositiveNumber } from '../../lib/numbers';
import type { NeedDraft, NeedFormErrors } from './types';

export function needToDraft(need: Need): NeedDraft {
  return {
    projectName: need.projectName,
    materialType: need.materialType,
    widthMm: String(need.widthMm),
    heightMm: String(need.heightMm),
    thicknessMm: need.thicknessMm === null ? '' : String(need.thicknessMm),
    quantity: String(need.quantity),
    region: need.region,
    neededBy: need.neededBy,
  };
}

export function needDraftHasChanges(
  draft: NeedDraft,
  baseline: NeedDraft,
): boolean {
  return Object.keys(draft).some(
    (key) =>
      draft[key as keyof NeedDraft] !== baseline[key as keyof NeedDraft],
  );
}

export function firstNeedFormError(
  errors: NeedFormErrors,
): keyof NeedFormErrors | undefined {
  const fieldOrder: (keyof NeedFormErrors)[] = [
    'projectName',
    'materialType',
    'widthMm',
    'heightMm',
    'thicknessMm',
    'quantity',
    'region',
    'neededBy',
  ];
  return fieldOrder.find((field) => errors[field]);
}

export function parseNeedForm(
  form: NeedDraft,
  today = istanbulDate(),
): { errors: NeedFormErrors; input: CreateNeedInput | null } {
  const errors: NeedFormErrors = {};
  const number = parseDecimalNumber;
  const positive = (value: string) => parsePositiveNumber(value) !== null;
  if (!form.projectName.trim() || form.projectName.trim().length > 200)
    errors.projectName = 'Proje adı 1–200 karakter olmalıdır.';
  if (!form.region.trim() || form.region.trim().length > 120)
    errors.region = 'Bölge 1–120 karakter olmalıdır.';
  if (!['wood', 'metal', 'plastic'].includes(form.materialType))
    errors.materialType = 'Geçerli bir malzeme seçin.';
  if (!positive(form.widthMm))
    errors.widthMm = '0 ile 1 milyar arasında bir ölçü girin.';
  if (!positive(form.heightMm))
    errors.heightMm = '0 ile 1 milyar arasında bir ölçü girin.';
  if (!positive(form.thicknessMm))
    errors.thicknessMm = 'Eşleşme için pozitif kalınlık zorunludur.';
  if (
    !/^\d+$/.test(form.quantity.trim()) ||
    !Number.isSafeInteger(number(form.quantity)) ||
    number(form.quantity) <= 0 ||
    number(form.quantity) > 2147483647
  )
    errors.quantity = 'Pozitif tam sayı girin (en fazla 2147483647).';
  if (!validDate(form.neededBy) || form.neededBy < today)
    errors.neededBy = 'Bugün veya ileri bir tarihi YYYY-AA-GG biçiminde girin.';
  if (Object.keys(errors).length) return { errors, input: null };
  return {
    errors,
    input: {
      projectName: form.projectName.trim(),
      materialType: form.materialType,
      widthMm: number(form.widthMm),
      heightMm: number(form.heightMm),
      thicknessMm: number(form.thicknessMm),
      quantity: number(form.quantity),
      region: form.region.trim(),
      neededBy: form.neededBy,
    },
  };
}
