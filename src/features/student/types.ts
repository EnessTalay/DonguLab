import type { MaterialType } from '@/types/domain';

export type NeedDraft = {
  projectName: string;
  materialType: MaterialType;
  widthMm: string;
  heightMm: string;
  thicknessMm: string;
  quantity: string;
  region: string;
  neededBy: string;
};

export interface NeedFormErrors {
  projectName?: string;
  materialType?: string;
  widthMm?: string;
  heightMm?: string;
  thicknessMm?: string;
  quantity?: string;
  region?: string;
  neededBy?: string;
}
