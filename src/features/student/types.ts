import type { Listing, MaterialType, Need, RequestStatus } from '@/types/domain';

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

export interface MatchCard {
  listing: Listing;
  score: number;
  reasons: string[];
  eligible: boolean;
}

export interface RequestStateView {
  id: string;
  projectName: string;
  listingTitle: string;
  status: RequestStatus;
  quantity: number;
  code?: string;
  expiresAt?: string;
}

export type NeedSnapshot = Need;
