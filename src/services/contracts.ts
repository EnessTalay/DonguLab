import type { Listing, MaterialRequest, Need, Role } from '../types/domain';

export type CreateListingInput = Omit<Listing, 'id' | 'businessId' | 'quantityReserved' | 'status'>;
export type CreateNeedInput = Omit<Need, 'id' | 'studentId' | 'status'>;
export interface Profile { id: string; role: Role; displayName: string }
export interface AppSession { profile: Profile }
export interface RequestView {
  request: MaterialRequest;
  listingTitle: string;
  projectName: string;
  expiresAt: string | null;
}
export type StudentRequestView = RequestView;
export type BusinessRequestView = RequestView;
export interface DeliveryCode { code: string; expiresAt: string }
export type ErrorCode = 'UNAUTHENTICATED' | 'FORBIDDEN' | 'VALIDATION' | 'NOT_FOUND' |
  'CONFLICT' | 'OUT_OF_STOCK' | 'INCOMPATIBLE' | 'EXPIRED' | 'INVALID_CODE' |
  'TOO_MANY_ATTEMPTS' | 'NETWORK' | 'CONFIGURATION' | 'UNKNOWN';

export class AppError extends Error {
  constructor(public readonly code: ErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

// Both implementations expose this exact interface. No caller supplies an owner ID.
export interface AppServices {
  readonly mode: 'demo' | 'supabase';
  signIn(email: string, password: string): Promise<AppSession>;
  signUp(email: string, password: string): Promise<{ confirmationRequired: boolean }>;
  signOut(): Promise<void>;
  getSession(): Promise<AppSession | null>;
  onAuthStateChange(listener: (session: AppSession | null) => void): () => void;
  getListing(id: string): Promise<Listing | null>;
  listListings(): Promise<Listing[]>;
  listMyListings(): Promise<Listing[]>;
  createListing(input: CreateListingInput): Promise<Listing>;
  updateListing(id: string, input: CreateListingInput): Promise<Listing>;
  closeListing(id: string): Promise<Listing>;
  updateNeed(id: string, input: CreateNeedInput): Promise<Need>;
  archiveNeed(id: string): Promise<Need>;
  createNeed(input: CreateNeedInput): Promise<Need>;
  listMyNeeds(): Promise<Need[]>;
  createRequest(needId: string, listingId: string): Promise<MaterialRequest>;
  listMyRequests(): Promise<StudentRequestView[]>;
  listIncomingRequests(): Promise<BusinessRequestView[]>;
  approveRequest(requestId: string): Promise<MaterialRequest>;
  rejectRequest(requestId: string, reason?: string): Promise<MaterialRequest>;
  cancelRequest(requestId: string, reason?: string): Promise<MaterialRequest>;
  issueDeliveryCode(requestId: string): Promise<DeliveryCode>;
  confirmDelivery(requestId: string, code: string): Promise<MaterialRequest>;
}
