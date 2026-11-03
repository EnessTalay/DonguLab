import { AppError, type ErrorCode } from '@/services/contracts';
import { errorMessage } from '@/lib/errors';

const listingMessages: Record<ErrorCode, string> = {
  UNAUTHENTICATED: 'Oturumunuz sona ermiş. Lütfen yeniden giriş yapın.',
  FORBIDDEN: 'İlan oluşturma yetkiniz bulunmuyor.',
  VALIDATION: 'İlan bilgilerini kontrol edip tekrar deneyin.',
  NOT_FOUND: 'İşletme hesabı bulunamadı.',
  CONFLICT: 'İlan oluşturulamadı. Bilgileri kontrol edip tekrar deneyin.',
  OUT_OF_STOCK: 'Yeterli stok bulunmuyor.',
  INCOMPATIBLE: 'İlan bilgileri uygun değil.',
  EXPIRED: 'Son teslim alma tarihi geçmiş.',
  INVALID_CODE: 'Girilen kod geçersiz.',
  TOO_MANY_ATTEMPTS: 'İşlem sınırına ulaşıldı. Daha sonra tekrar deneyin.',
  NETWORK: 'Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.',
  CONFIGURATION: 'Servis yapılandırması tamamlanmamış. Lütfen destek alın.',
  UNKNOWN: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
};
const requestMessages = {
  ...listingMessages,
  FORBIDDEN: 'Bu talep için işlem yapma yetkiniz bulunmuyor.',
  VALIDATION: 'Talep bilgileri geçersiz.',
  NOT_FOUND: 'Talep bulunamadı veya artık mevcut değil.',
  CONFLICT: 'Talep artık bu durumda işlenemiyor. Listeyi yenileyin.',
  OUT_OF_STOCK: 'Yeterli stok kalmadığı için talep onaylanamadı.',
  INCOMPATIBLE: 'İlan artık bu taleple eşleşmiyor.',
  EXPIRED: 'Talebin işlem süresi dolmuş.',
  INVALID_CODE: 'Teslim kodu geçersiz.',
  TOO_MANY_ATTEMPTS: 'İşlem sınırına ulaşıldı.',
};

const fallback =
  'Beklenmeyen bir hata olu\u015ftu. L\u00fctfen tekrar deneyin.';
export const getErrorMessage = (error: unknown) =>
  errorMessage(
    error instanceof AppError ? error : null,
    fallback,
    listingMessages,
  );
export const getRequestErrorMessage = (error: unknown) =>
  errorMessage(
    error instanceof AppError ? error : null,
    fallback,
    requestMessages,
  );
