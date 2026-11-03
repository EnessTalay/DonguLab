import type { MaterialType, RequestStatus } from '../types/domain';

export const materialLabels: Record<MaterialType, string> = {
  wood: 'Ahşap',
  metal: 'Metal',
  plastic: 'Plastik',
};
export const materialOptions = (
  Object.keys(materialLabels) as MaterialType[]
).map((value) => ({ value, label: materialLabels[value] }));
export const requestStatusLabels: Record<RequestStatus, string> = {
  pending: 'Bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  cancelled: 'İptal edildi',
  delivered: 'Teslim edildi',
};
