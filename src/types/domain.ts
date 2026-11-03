export type Role = 'student' | 'business';
export type MaterialType = 'wood' | 'metal' | 'plastic';

export interface MaterialSpec {
  materialType: MaterialType;
  widthMm: number;
  heightMm: number;
  thicknessMm: number | null;
  region: string;
}

export type ListingStatus = 'active' | 'closed';
export type NeedStatus = 'active' | 'archived';

export interface Listing extends MaterialSpec {
  status: ListingStatus;
  id: string;
  businessId: string;
  title: string;
  description: string;
  pickupInstructions: string;
  quantityOnHand: number;
  quantityReserved: number;
  pickupDeadline: string;
}

export interface Need extends MaterialSpec {
  status: NeedStatus;
  id: string;
  studentId: string;
  projectName: string;
  quantity: number;
  neededBy: string;
}

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'delivered';

export interface MaterialRequest {
  id: string;
  needId: string;
  listingId: string;
  studentId: string;
  quantity: number;
  status: RequestStatus;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
}
