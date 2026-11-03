import { AppError, type ErrorCode } from '@/services/contracts';
import { errorMessage } from '@/lib/errors';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

// The caller memoizes load. Late results cannot overwrite a newer request or a blurred screen.
export function useFocusedResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const active = useRef(false);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const ticket = ++generation.current;
    if (active.current) {
      setLoading(true);
      setError('');
      setErrorCode(null);
    }
    try {
      const result = await load();
      if (active.current && ticket === generation.current) {
        setData(result);
        return true;
      }
    } catch (e) {
      if (active.current && ticket === generation.current) {
        setError(errorMessage(e, 'Bilgiler yüklenemedi.'));
        setErrorCode(e instanceof AppError ? e.code : null);
      }
    } finally {
      if (active.current && ticket === generation.current) setLoading(false);
    }
    return false;
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      setData(null);
      void reload();
      return () => {
        active.current = false;
        generation.current++;
      };
    }, [reload]),
  );
  return { data, loading, error, errorCode, reload };
}
