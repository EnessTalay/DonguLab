import type { Listing, Need } from '@/types/domain';

// Relative dates keep the starter examples useful whenever the project is opened.
const dateAfter = (days: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const demoListings: readonly Listing[] = [
  {
    id: 'wood-1',
    businessId: 'demo-business',
    title: 'Atölyeden kontrplak parçaları',
    materialType: 'wood',
    widthMm: 600,
    heightMm: 400,
    thicknessMm: 6,
    quantityOnHand: 12,
    quantityReserved: 2,
    region: 'İstanbul',
    pickupDeadline: dateAfter(7),
  },
  {
    id: 'wood-2',
    businessId: 'demo-business',
    title: 'Küçük ahşap parçalar',
    materialType: 'wood',
    widthMm: 100,
    heightMm: 100,
    thicknessMm: 6,
    quantityOnHand: 8,
    quantityReserved: 0,
    region: 'İstanbul',
    pickupDeadline: dateAfter(7),
  },
  {
    id: 'metal-1',
    businessId: 'demo-business',
    title: 'Alüminyum levha',
    materialType: 'metal',
    widthMm: 600,
    heightMm: 400,
    thicknessMm: 6,
    quantityOnHand: 4,
    quantityReserved: 0,
    region: 'İstanbul',
    pickupDeadline: dateAfter(7),
  },
  {
    id: 'wood-3',
    businessId: 'demo-business',
    title: 'Kalınlığı doğrulanacak ahşap',
    materialType: 'wood',
    widthMm: 600,
    heightMm: 400,
    thicknessMm: null,
    quantityOnHand: 5,
    quantityReserved: 0,
    region: 'İstanbul',
    pickupDeadline: dateAfter(7),
  },
];

export const demoNeed: Need = {
  id: 'demo-need',
  studentId: 'demo-student',
  projectName: 'Mimari maket',
  materialType: 'wood',
  widthMm: 300,
  heightMm: 200,
  thicknessMm: 6,
  quantity: 3,
  region: 'İstanbul',
  neededBy: dateAfter(3),
};

export const demoAccounts = [
  {
    email: 'ogrenci@demo.local',
    password: 'Demo123!',
    profile: {
      id: 'demo-student',
      role: 'student',
      displayName: 'Demo Öğrenci',
    },
  },
  {
    email: 'isletme@demo.local',
    password: 'Demo123!',
    profile: {
      id: 'demo-business',
      role: 'business',
      displayName: 'Demo İşletme',
    },
  },
] as const;
