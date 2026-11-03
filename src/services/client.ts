import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { AppError } from './contracts';

let client: SupabaseClient | undefined;
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !/^https?:\/\//.test(url) || key.startsWith('sb_secret_')) {
    throw new AppError('CONFIGURATION', 'Supabase URL ve public/publishable anahtarını .env dosyasında tanımlayın.');
  }
  // Reject legacy service_role JWTs as well as new secret keys, without logging them.
  if (key.includes('.')) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string };
      if (payload.role !== 'anon') throw new Error('Non-public key');
    } catch { throw new AppError('CONFIGURATION', 'Yalnız public/publishable veya eski anon anahtarı kullanılabilir.'); }
  } else if (!key.startsWith('sb_publishable_')) {
    throw new AppError('CONFIGURATION', 'Geçerli bir public/publishable anahtarı gerekli.');
  }
  client = createClient(url, key, { auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    persistSession: true, autoRefreshToken: true, detectSessionInUrl: false,
  } });
  return client;
}
