import { useState } from 'react';
import { services } from '@/services';
import { getRequestErrorMessage } from './errors';
import type { BusinessResources } from './use-business-resources';

export function useBusinessRequests({
  refreshRequestActionData,
}: BusinessResources) {
  const [requestActionMessage, setRequestActionMessage] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);
  const [activeRequestAction, setActiveRequestAction] = useState<{
    requestId: string;
    action: 'approve' | 'reject' | 'delivery';
  } | null>(null);
  const [deliveryCodes, setDeliveryCodes] = useState<Record<string, string>>(
    {},
  );
  function getRefreshWarning(
    result: Awaited<ReturnType<typeof refreshRequestActionData>>,
    successMessage: string,
  ) {
    const failedLists = [
      !result.requestsRefreshed && 'gelen talepler',
      !result.listingsRefreshed && 'İlanlarım',
    ].filter(Boolean);

    return failedLists.length
      ? `${successMessage} Ancak ${failedLists.join(' ve ')} listesi yenilenemedi. İlgili listedeki yeniden deneme düğmesini kullanın.`
      : null;
  }

  async function handleRequestAction(
    requestId: string,
    action: 'approve' | 'reject',
    reason?: string,
  ) {
    if (activeRequestAction) return;
    setActiveRequestAction({ requestId, action });
    setRequestActionMessage(null);
    try {
      if (action === 'approve') {
        await services.approveRequest(requestId);
      } else {
        await services.rejectRequest(requestId, reason);
      }

      const refreshResult = await refreshRequestActionData();
      const successMessage =
        action === 'approve' ? 'Talep onaylandı.' : 'Talep reddedildi.';
      const refreshWarning = getRefreshWarning(refreshResult, successMessage);
      setRequestActionMessage({
        type: 'success',
        message: refreshWarning ?? successMessage,
      });
    } catch (error) {
      setRequestActionMessage({
        type: 'error',
        message: getRequestErrorMessage(error),
      });
    } finally {
      setActiveRequestAction(null);
    }
  }

  async function handleDeliveryConfirmation(requestId: string) {
    if (activeRequestAction) return;
    const code = deliveryCodes[requestId] ?? '';
    if (!code) {
      setRequestActionMessage({
        type: 'error',
        message: 'Lütfen teslimat kodunu girin.',
      });
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setRequestActionMessage({
        type: 'error',
        message: 'Teslimat kodu tam olarak 6 rakam olmalıdır.',
      });
      return;
    }

    setActiveRequestAction({ requestId, action: 'delivery' });
    setRequestActionMessage(null);
    try {
      await services.confirmDelivery(requestId, code);
      setDeliveryCodes((current) => ({ ...current, [requestId]: '' }));
      const refreshResult = await refreshRequestActionData();
      const successMessage = 'Teslimat doğrulandı ve tamamlandı.';
      const refreshWarning = getRefreshWarning(refreshResult, successMessage);
      setRequestActionMessage({
        type: 'success',
        message: refreshWarning ?? successMessage,
      });
    } catch (error) {
      setRequestActionMessage({
        type: 'error',
        message: getRequestErrorMessage(error),
      });
    } finally {
      setActiveRequestAction(null);
    }
  }

  return {
    requestActionMessage,
    activeRequestAction,
    deliveryCodes,
    setDeliveryCodes,
    handleRequestAction,
    handleDeliveryConfirmation,
  };
}
