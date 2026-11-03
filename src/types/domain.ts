export type Role = 'student' | 'business';
export type MaterialType = 'wood' | 'metal' | 'plastic';

export interface MaterialSpec {
  materialType: MaterialType;
  widthMm: number;
  heightMm: number;
  thicknessMm: number | null;
  region: string;
}

export interface Listing extends MaterialSpec {
  id: string;
  businessId: string;
  title: string;
  quantityOnHand: number;
  quantityReserved: number;
  pickupDeadline: string;
}

export interface Need extends MaterialSpec {
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
}
