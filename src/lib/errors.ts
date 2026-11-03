import { AppError, type ErrorCode } from '../services/contracts';

export const errorMessage = (
  error: unknown,
  fallback = 'İşlem tamamlanamadı. Yeniden deneyin.',
  overrides?: Partial<Record<ErrorCode, string>>,
) =>
  error instanceof AppError
    ? (overrides?.[error.code] ?? error.message)
    : error instanceof Error
      ? error.message
      : fallback;
