import { AppError, services, type CreateNeedInput, type StudentRequestView as RequestView } from '../../services';
import { istanbulDate } from '../../services/validation';
import { rankMatches } from './matching';

export type NeedInput = CreateNeedInput;
export type StudentRequestView = RequestView & { statusLabel: string };
const labels = { pending: 'Bekliyor', approved: 'Onaylandı', rejected: 'Reddedildi', cancelled: 'İptal edildi', delivered: 'Teslim edildi' };

export const studentService = {
  createNeed: (input: NeedInput) => services.createNeed(input),
  listMyNeeds: () => services.listMyNeeds(),
  async getNeed(id: string) {
    return (await services.listMyNeeds()).find(need => need.id === id);
  },
  async listMatches(id: string) {
    const [needs, listings] = await Promise.all([services.listMyNeeds(), services.listListings()]);
    const need = needs.find(item => item.id === id);
    if (!need) throw new AppError('NOT_FOUND', 'İhtiyaç kaydı bulunamadı. İhtiyaçlarım ekranına dönün.');
    return rankMatches(need, listings, istanbulDate());
  },
  createRequest: (needId: string, listingId: string) => services.createRequest(needId, listingId),
  async listMyRequests(): Promise<StudentRequestView[]> {
    return (await services.listMyRequests()).map(item => ({ ...item, statusLabel: labels[item.request.status] }));
  },
  issueDeliveryCode: (id: string) => services.issueDeliveryCode(id),
  cancelRequest: (id: string) => services.cancelRequest(id),
};
