import { requestStatusLabels } from '../../lib/labels';
import {
  AppError,
  services,
  type CreateNeedInput,
  type StudentRequestView as RequestView,
} from '../../services';
import { istanbulDate } from '../../services/validation';
import { rankMatches } from './matching';
import { needIsReadOnly } from './need-list';

export { filterNeedsByStatus } from './need-list';
export type { NeedListFilter } from './need-list';

export type StudentRequestView = RequestView & { statusLabel: string };

export const studentService = {
  createNeed: (input: CreateNeedInput) => services.createNeed(input),
  listMyNeeds: () => services.listMyNeeds(),
  updateNeed: (id: string, input: CreateNeedInput) =>
    services.updateNeed(id, input),
  archiveNeed: (id: string) => services.archiveNeed(id),
  async getNeed(id: string) {
    return (await services.listMyNeeds()).find((need) => need.id === id);
  },
  async listMatches(id: string) {
    const [needs, listings] = await Promise.all([
      services.listMyNeeds(),
      services.listListings(),
    ]);
    const need = needs.find((item) => item.id === id);
    if (!need)
      throw new AppError(
        'NOT_FOUND',
        'İhtiyaç kaydı bulunamadı. İhtiyaçlarım ekranına dönün.',
      );
    if (needIsReadOnly(need))
      throw new AppError(
        'CONFLICT',
        'Arşivlenmiş ihtiyaçlar için yeni ilan talebi oluşturulamaz.',
      );
    return rankMatches(need, listings, istanbulDate());
  },
  createRequest: (needId: string, listingId: string) =>
    services.createRequest(needId, listingId),
  async listMyRequests(): Promise<StudentRequestView[]> {
    return (await services.listMyRequests()).map((item) => ({
      ...item,
      statusLabel: requestStatusLabels[item.request.status],
    }));
  },
  issueDeliveryCode: (id: string) => services.issueDeliveryCode(id),
  cancelRequest: (id: string) => services.cancelRequest(id),
};
