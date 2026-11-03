import type { CreateNeedInput } from '../../services/contracts';
import { istanbulDate, validDate } from '../../services/validation';
import type { NeedDraft, NeedFormErrors } from './types';

export function parseNeedForm(form: NeedDraft, today = istanbulDate()): { errors: NeedFormErrors; input: CreateNeedInput | null } {
  const errors: NeedFormErrors = {};
  const number = (value: string) => Number(value.trim().replace(',', '.'));
  const positive = (value: string) => value.trim() !== '' && Number.isFinite(number(value)) && number(value) > 0 && number(value) < 1e9;
  if (!form.projectName.trim() || form.projectName.trim().length > 200) errors.projectName = 'Proje adı 1–200 karakter olmalıdır.';
  if (!form.region.trim() || form.region.trim().length > 120) errors.region = 'Bölge 1–120 karakter olmalıdır.';
  if (!['wood', 'metal', 'plastic'].includes(form.materialType)) errors.materialType = 'Geçerli bir malzeme seçin.';
  if (!positive(form.widthMm)) errors.widthMm = '0 ile 1 milyar arasında bir ölçü girin.';
  if (!positive(form.heightMm)) errors.heightMm = '0 ile 1 milyar arasında bir ölçü girin.';
  if (!positive(form.thicknessMm)) errors.thicknessMm = 'Eşleşme için pozitif kalınlık zorunludur.';
  if (!/^\d+$/.test(form.quantity.trim()) || !Number.isSafeInteger(number(form.quantity)) || number(form.quantity) <= 0 || number(form.quantity) > 2147483647) errors.quantity = 'Pozitif tam sayı girin (en fazla 2147483647).';
  if (!validDate(form.neededBy) || form.neededBy < today) errors.neededBy = 'Bugün veya ileri bir tarihi YYYY-AA-GG biçiminde girin.';
  if (Object.keys(errors).length) return { errors, input: null };
  return { errors, input: {
    projectName: form.projectName.trim(), materialType: form.materialType,
    widthMm: number(form.widthMm), heightMm: number(form.heightMm), thicknessMm: number(form.thicknessMm),
    quantity: number(form.quantity), region: form.region.trim(), neededBy: form.neededBy,
  } };
}
