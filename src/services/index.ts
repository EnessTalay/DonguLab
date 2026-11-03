import { demoListings, demoNeed } from '../fixtures/demo';
import { createDemoServices, createDemoStore } from './mock';
import { createSupabaseServices } from './supabase';
import { getSupabaseClient } from './client';
import { AppError } from './contracts';

export * from './contracts';
const configuredMode = process.env.EXPO_PUBLIC_DATA_MODE ?? 'supabase';
export const configurationError = ['demo', 'supabase'].includes(configuredMode)
  ? null
  : new AppError(
      'CONFIGURATION',
      'EXPO_PUBLIC_DATA_MODE yalnız demo veya supabase olabilir.',
    );
// Invalid real configuration must NEVER silently fall back to simulated success.
export const services =
  configuredMode === 'demo'
    ? createDemoServices(createDemoStore(demoListings, [demoNeed]))
    : createSupabaseServices(getSupabaseClient);
