import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import { AppError, configurationError, services, type AppSession } from './index';
import { getSupabaseClient } from './client';

interface SessionState { session: AppSession | null; loading: boolean; error: string | null; refresh: () => Promise<void> }
const SessionContext = createContext<SessionState | null>(null);
export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AppSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const ticket = ++revision.current;
    try {
      if (configurationError) throw configurationError;
      const value = await services.getSession();
      if (ticket === revision.current) { setSession(value); setError(null); }
    } catch (e) { if (ticket === revision.current) { setSession(null); setError(e instanceof AppError ? e.message : 'Oturum yüklenemedi.'); } }
    finally { if (ticket === revision.current) setLoading(false); }
  }, []);
  useEffect(() => {
    let mounted = true;
    let unsubscribe = () => {};
    let removeAppState = () => {};
    async function initialize() {
      try {
        if (configurationError) throw configurationError;
        unsubscribe = services.onAuthStateChange(value => {
          if (mounted) { revision.current++; setSession(value); setLoading(false); setError(null); }
        });
        if (services.mode === 'supabase' && Platform.OS !== 'web') {
          const client = getSupabaseClient();
          const update = (state: string) => state === 'active' ? client.auth.startAutoRefresh() : client.auth.stopAutoRefresh();
          update(AppState.currentState);
          const subscription = AppState.addEventListener('change', update);
          removeAppState = () => { subscription.remove(); client.auth.stopAutoRefresh(); };
        }
        const startRevision = revision.current;
        const value = await services.getSession();
        if (mounted && startRevision === revision.current) { setSession(value); setLoading(false); }
      } catch (e) {
        if (mounted) { setError(e instanceof AppError ? e.message : 'Oturum başlatılamadı.'); setLoading(false); }
      }
    }
    void initialize();
    return () => { mounted = false; unsubscribe(); removeAppState(); };
  }, []);
  return <SessionContext.Provider value={{ session, loading, error, refresh }}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('SessionProvider gerekli.');
  return value;
}
