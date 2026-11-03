import { AppError } from '@/services/contracts';
import { colors } from '@/theme/tokens';
import { materialLabels } from '@/lib/labels';
import { formatDateTime } from '@/lib/dates';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ActionButton, Feedback } from '@/components/ui';
import { Card } from '@/components/card';
import { Screen, styles as screenStyles } from '@/components/screen';
import { StatePanel } from '@/components/state-panel';
import { StatusBadge } from '@/components/status-badge';
import { useFocusedResource } from '@/hooks/use-focused-resource';
import { useSession } from '@/services/session';
import { services } from '@/services';
import { studentService } from '@/features/student/service';
import type { Listing, MaterialRequest, Need } from '@/types/domain';
import {
  studentCancelReasons,
  businessRejectReasons,
} from './reasons';

export default function RequestDetailScreen() {
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();
  const routeRequestId = Array.isArray(id) ? id[0] : id;
  const { session } = useSession();

  const [deliveryCode, setDeliveryCode] = useState<{
    code: string;
    expiresAt: string;
  } | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [now, setNow] = useState(() => Date.now());

  // Reason dialogs
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string>(
    studentCancelReasons[0],
  );
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState<string>(
    businessRejectReasons[0],
  );

  const inFlight = useRef(false);

  // Periodic timer for reservation countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const { data, loading, error, errorCode, reload } = useFocusedResource(
    useCallback(async () => {
      if (!routeRequestId) {
        throw new AppError('NOT_FOUND', 'Talep bağlantısı geçersiz.');
      }
      if (!session) {
        throw new AppError('UNAUTHENTICATED', 'Lütfen önce giriş yapın.');
      }

      const role = session.profile.role;
      let matchedRequest:
        | {
            request: MaterialRequest;
            listingTitle: string;
            projectName: string;
            expiresAt: string | null;
          }
        | undefined;
      let listingObj: Listing | undefined;
      let needObj: Need | undefined;

      if (role === 'student') {
        const studentRequests = await studentService.listMyRequests();
        matchedRequest = studentRequests.find(
          (item) => item.request.id === routeRequestId,
        );

        if (matchedRequest) {
          const [requestListing, needs] = await Promise.all([
            services.getListing(matchedRequest.request.listingId),
            studentService.listMyNeeds(),
          ]);
          listingObj = requestListing ?? undefined;
          needObj = needs.find((n) => n.id === matchedRequest?.request.needId);
        }
      } else {
        const businessRequests = await services.listIncomingRequests();
        matchedRequest = businessRequests.find(
          (item) => item.request.id === routeRequestId,
        );

        if (matchedRequest) {
          const myListings = await services.listMyListings();
          listingObj = myListings.find(
            (l) => l.id === matchedRequest?.request.listingId,
          );
        }
      }

      if (!matchedRequest) {
        throw new AppError(
          'NOT_FOUND',
          'Talep kaydı bulunamadı veya bu hesaba ait değil.',
        );
      }

      return {
        requestView: matchedRequest,
        listing: listingObj,
        need: needObj,
      };
    }, [routeRequestId, session]),
  );

  const requestView = data?.requestView;
  const request = requestView?.request;
  const listing = data?.listing;
  const need = data?.need;

  const isStudent = session?.profile.role === 'student';
  const isBusiness = session?.profile.role === 'business';

  // Issue delivery code (Student)
  const handleIssueDeliveryCode = async () => {
    if (!request || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setActionError('');
    setActionNotice('');
    try {
      const codeRes = await studentService.issueDeliveryCode(request.id);
      setDeliveryCode(codeRes);
      setActionNotice('Teslim kodu başarıyla üretildi.');
      await reload();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Teslim kodu üretilemedi.',
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  // Confirm delivery (Business)
  const handleConfirmDelivery = async () => {
    if (!request || inFlight.current) return;
    const cleanCode = inputCode.trim();
    if (!cleanCode) {
      setActionError('Lütfen 6 haneli teslimat kodunu girin.');
      return;
    }
    if (!/^\d{6}$/.test(cleanCode)) {
      setActionError('Teslimat kodu tam olarak 6 rakamdan oluşmalıdır.');
      return;
    }

    inFlight.current = true;
    setBusy(true);
    setActionError('');
    setActionNotice('');
    try {
      await services.confirmDelivery(request.id, cleanCode);
      setInputCode('');
      setActionNotice('Teslimat başarıyla doğrulandı ve tamamlandı!');
      const refreshed = await reload();
      if (!refreshed) {
        setActionNotice(
          'Teslimat tamamlandı; ancak güncel durum sunucudan yenilenemedi. Gösterilen bilgiler kaydedilen son durumdur.',
        );
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Teslimat doğrulanamadı.',
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  // Approve request (Business)
  const handleApprove = async () => {
    if (!request || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setActionError('');
    setActionNotice('');
    try {
      await services.approveRequest(request.id);
      setActionNotice('Talep onaylandı ve malzeme öğrenci için rezerve edildi.');
      const refreshed = await reload();
      if (!refreshed) {
        setActionNotice(
          'Talep onaylandı; ancak liste yenilenemedi. İlgili listedeki yenile düğmesini kullanabilirsiniz.',
        );
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Talep onaylanamadı.',
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  // Reject request (Business)
  const handleReject = async () => {
    if (!request || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setActionError('');
    setActionNotice('');
    try {
      await services.rejectRequest(request.id, selectedRejectReason);
      setShowRejectDialog(false);
      setActionNotice('Talep reddedildi.');
      const refreshed = await reload();
      if (!refreshed) {
        setActionNotice(
          'Talep reddedildi; ancak liste yenilenemedi.',
        );
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Talep reddedilemedi.',
      );
      setShowRejectDialog(false);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  // Cancel request (Student)
  const handleCancel = async () => {
    if (!request || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setActionError('');
    setActionNotice('');
    try {
      await studentService.cancelRequest(request.id, selectedCancelReason);
      setDeliveryCode(null);
      setShowCancelDialog(false);
      setActionNotice('Talep iptal edildi. Ayrılmış stok serbest bırakıldı.');
      const refreshed = await reload();
      if (!refreshed) {
        setActionNotice(
          'Talep iptal edildi; ancak liste yenilenemedi.',
        );
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Talep iptal edilemedi.',
      );
      setShowCancelDialog(false);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  if (loading && !request) {
    return (
      <Screen title="Talep detayı">
        <Feedback loading loadingLabel="Talep bilgileri yükleniyor…" />
      </Screen>
    );
  }

  if (error || !request || !requestView) {
    return (
      <Screen title="Talep detayı">
        <Feedback
          error={error || 'Talep bulunamadı.'}
          errorCode={errorCode}
          retry={() => void reload()}
        />
        <ActionButton
          title="Geri dön"
          secondary
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  const isExpired =
    request.status === 'approved' &&
    requestView.expiresAt !== null &&
    new Date(requestView.expiresAt).getTime() <= now;

  const storedCancellationReason = request.cancellationReason;
  const storedRejectionReason = request.rejectionReason;

  // Status explanation copy
  let statusExplanation = '';
  let nextStepExplanation = '';

  switch (request.status) {
    case 'pending':
      statusExplanation = isStudent
        ? 'Talebiniz işletmeye iletildi. İşletme inceleyip onayladığında malzeme sizin için rezerve edilecek ve teslim kodu oluşturabileceksiniz.'
        : 'Öğrenci bu malzeme için talep gönderdi. Onayladığınızda malzeme rezerve edilecek, reddettiğinizde talep kapanacaktır.';
      nextStepExplanation = isStudent
        ? 'Sonraki adım: İşletmenin onaylamasını bekleyin.'
        : 'Sonraki adım: Talebi onaylayabilir veya gerekçe belirterek reddedebilirsiniz.';
      break;
    case 'approved':
      statusExplanation = isStudent
        ? 'Talebiniz onaylandı! Malzeme sizin için rezerve edildi. Belirtilen son geçerlilik süresine kadar teslim kodunuzu oluşturup malzemeyi teslim alabilirsiniz.'
        : 'Talep onaylandı ve malzeme rezerve edildi. Öğrenci teslim almaya geldiğinde 6 haneli teslim kodunu kontrol ediniz.';
      nextStepExplanation = isStudent
        ? 'Sonraki adım: Teslimat kodunuzu oluşturun ve atölyede işletme yetkilisine gösterin.'
        : 'Sonraki adım: Öğrencinin getirdiği 6 haneli teslimat kodunu aşağıdan doğrulayın.';
      break;
    case 'rejected':
      statusExplanation =
        storedRejectionReason
          ? `Bu talep işletme tarafından reddedildi. Belirtilen gerekçe: "${storedRejectionReason}".`
          : 'Bu talep işletme tarafından reddedildi.';
      nextStepExplanation = isStudent
        ? 'Sonraki adım: Projeniz için diğer uygun ilanları inceleyebilirsiniz.'
        : 'İşlem tamamlandı.';
      break;
    case 'cancelled':
      statusExplanation =
        storedCancellationReason
          ? `Bu talep öğrenci tarafından iptal edildi. Belirtilen gerekçe: "${storedCancellationReason}".`
          : 'Bu talep iptal edildi. Ayrılmış rezerve stok serbest bırakıldı.';
      nextStepExplanation = 'İşlem tamamlandı.';
      break;
    case 'delivered':
      statusExplanation =
        'Malzeme başarıyla teslim edildi ve işlem tamamlandı. Stok kayıtlardan kalıcı olarak düşüldü.';
      nextStepExplanation = 'Döngü tamamlandı! Projede başarılar dileriz.';
      break;
  }

  return (
    <Screen title="Talep Detayı">
      {created === '1' && (
        <StatePanel
          kind="success"
          title="Talebiniz başarıyla oluşturuldu"
          message="İşletme onayladığında malzeme rezerve edilecektir. Durumu buradan takip edebilirsiniz."
        />
      )}

      {actionNotice ? (
        <StatePanel
          kind="success"
          title="İşlem tamamlandı"
          message={actionNotice}
          action={
            actionNotice.includes('yenilenemedi')
              ? {
                  label: 'Verileri yenile',
                  onPress: () => void reload(),
                }
              : undefined
          }
        />
      ) : null}

      {actionError ? (
        <StatePanel
          kind="error"
          title="İşlem tamamlanamadı"
          message={actionError}
          action={{
            label: 'Yeniden dene',
            onPress: () => {
              setActionError('');
              void reload();
            },
          }}
        />
      ) : null}

      {/* Status Overview Card */}
      <Card style={screenStyles.card}>
        <View style={styles.statusRow}>
          <Text style={screenStyles.heading}>Talep Durumu</Text>
          <StatusBadge status={request.status} />
        </View>

        <Text style={styles.statusExplText}>{statusExplanation}</Text>
        <Text style={styles.nextStepText}>{nextStepExplanation}</Text>
      </Card>

      {/* Reservation & Expiration Card (When Approved) */}
      {request.status === 'approved' && requestView.expiresAt && (
        <Card
          style={[
            screenStyles.card,
            isExpired ? styles.expiredCard : styles.activeReservationCard,
          ]}
        >
          <Text
            style={[
              screenStyles.heading,
              isExpired ? { color: colors.danger } : { color: '#165e38' },
            ]}
          >
            {isExpired ? 'Rezervasyon Süresi Doldu' : 'Rezervasyon Süresi'}
          </Text>

          <Text style={styles.reservationExpiry}>
            Son Geçerlilik:{' '}
            <Text style={{ fontWeight: '700' }}>
              {formatDateTime(requestView.expiresAt)}
            </Text>
          </Text>

          <Text style={styles.reservationRuleNote}>
            {isExpired
              ? 'Belirtilen süre dolduğu için onay geçerliliğini yitirmiştir ve ayrılan stok serbest bırakılmıştır.'
              : 'Rezervasyon süresi en fazla 2 saat ve gün sonu ile sınırlıdır. Süre dolduğunda talep otomatik olarak iptal edilir ve ayrılan malzeme diğer öğrencilere açılır.'}
          </Text>
        </Card>
      )}

      {/* Delivery Code Section */}
      {request.status === 'approved' && !isExpired && (
        <Card style={[screenStyles.card, styles.deliveryCard]}>
          <Text style={screenStyles.heading}>Teslimat Kodu İşlemleri</Text>

          {/* Student Code Generation / Display */}
          {isStudent && (
            <>
              {deliveryCode && new Date(deliveryCode.expiresAt).getTime() > now ? (
                <View style={styles.codeContainer}>
                  <Text style={styles.codeLabel}>6 Haneli Teslim Kodunuz:</Text>
                  <Text style={styles.codeDisplay}>{deliveryCode.code}</Text>
                  <Text style={styles.codeExpiry}>
                    Geçerlilik: {formatDateTime(deliveryCode.expiresAt)}
                  </Text>
                  <Text style={styles.codeWarning}>
                    Bu kodu yalnızca atölyeye gidip malzemeyi fiziksel olarak
                    teslim alırken işletme yetkilisine gösterin.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <Text style={screenStyles.body}>
                    Malzemeyi teslim alabilmek için 6 haneli güvenlik kodu
                    oluşturmanız gerekmektedir.
                  </Text>
                  <ActionButton
                    title={
                      busy
                        ? 'Kod oluşturuluyor…'
                        : deliveryCode
                          ? 'Süresi dolan kodu yenile'
                          : 'Teslim Kodu Oluştur'
                    }
                    loading={busy}
                    disabled={busy}
                    onPress={() => void handleIssueDeliveryCode()}
                  />
                </View>
              )}
            </>
          )}

          {/* Business Code Verification */}
          {isBusiness && (
            <View style={{ gap: 12 }}>
              <Text style={screenStyles.body}>
                Öğrencinin getirdiği 6 haneli teslimat kodunu doğrulayarak
                teslimatı tamamlayın:
              </Text>
              <TextInput
                accessibilityLabel="6 haneli teslimat kodu"
                placeholder="Örn: 123456"
                value={inputCode}
                onChangeText={setInputCode}
                keyboardType="numeric"
                maxLength={6}
                style={styles.codeInput}
              />
              <ActionButton
                title={busy ? 'Doğrulanıyor…' : 'Teslimatı Doğrula ve Tamamla'}
                loading={busy}
                disabled={busy || inputCode.trim().length !== 6}
                onPress={() => void handleConfirmDelivery()}
              />
            </View>
          )}
        </Card>
      )}

      {/* Request Details & Parties */}
      <Card style={screenStyles.card}>
        <Text style={screenStyles.heading}>Talep Bilgileri</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Talep Edilen Miktar:</Text>
          <Text style={styles.infoValue}>{request.quantity} adet</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>İlgili İlan:</Text>
          <Text style={styles.infoValue}>{requestView.listingTitle}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Öğrenci Projesi:</Text>
          <Text style={styles.infoValue}>{requestView.projectName}</Text>
        </View>

        {listing ? (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Malzeme Türü:</Text>
              <Text style={styles.infoValue}>
                {materialLabels[listing.materialType]}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ölçüler:</Text>
              <Text style={styles.infoValue}>
                {listing.widthMm} × {listing.heightMm} ×{' '}
                {listing.thicknessMm !== null
                  ? `${listing.thicknessMm} mm`
                  : 'Belirtilmemiş'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bölge:</Text>
              <Text style={styles.infoValue}>{listing.region}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Son Teslim Tarihi:</Text>
              <Text style={styles.infoValue}>{listing.pickupDeadline}</Text>
            </View>
          </>
        ) : null}

        {listing?.pickupInstructions ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.infoLabel}>Teslim Alma Talimatı:</Text>
            <Text style={[screenStyles.body, { marginTop: 4 }]}>
              {listing.pickupInstructions}
            </Text>
          </View>
        ) : null}

        {need ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>İhtiyaç Tarihi:</Text>
            <Text style={styles.infoValue}>{need.neededBy}</Text>
          </View>
        ) : null}
      </Card>

      {/* Business Actions: Approve / Reject Dialog */}
      {isBusiness && request.status === 'pending' && !showRejectDialog && (
        <View style={styles.actionsContainer}>
          <ActionButton
            title={busy ? 'Onaylanıyor…' : 'Talebi Onayla'}
            loading={busy}
            disabled={busy}
            onPress={() => void handleApprove()}
          />
          <ActionButton
            title="Talebi Reddet"
            secondary
            disabled={busy}
            onPress={() => setShowRejectDialog(true)}
          />
        </View>
      )}

      {/* Rejection Reason Dialog for Business */}
      {showRejectDialog && (
        <Card style={[screenStyles.card, styles.dialogCard]}>
          <Text style={styles.dialogHeader}>Talebi Reddetme Gerekçesi</Text>
          <Text style={screenStyles.body}>
            Lütfen talebi reddetme nedeninizi seçin. Bu bilgi öğrenciye
            iletilecektir:
          </Text>

          <View style={{ gap: 8 }}>
            {businessRejectReasons.map((reason) => (
              <Pressable
                key={reason}
                accessibilityRole="button"
                onPress={() => setSelectedRejectReason(reason)}
                style={[
                  styles.reasonOption,
                  selectedRejectReason === reason && styles.reasonOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.reasonOptionText,
                    selectedRejectReason === reason &&
                      styles.reasonOptionTextSelected,
                  ]}
                >
                  {reason}
                </Text>
              </Pressable>
            ))}
          </View>

          <ActionButton
            title={busy ? 'Reddediliyor…' : 'Reddetmeyi Onayla'}
            loading={busy}
            disabled={busy}
            onPress={() => void handleReject()}
          />
          <ActionButton
            title="Vazgeç"
            secondary
            disabled={busy}
            onPress={() => setShowRejectDialog(false)}
          />
        </Card>
      )}

      {/* Student Actions: Cancel Request Dialog */}
      {isStudent &&
        (request.status === 'pending' || request.status === 'approved') &&
        !showCancelDialog && (
          <View style={styles.actionsContainer}>
            <ActionButton
              title="Talebi İptal Et"
              secondary
              disabled={busy}
              onPress={() => setShowCancelDialog(true)}
            />
          </View>
        )}

      {/* Cancellation Reason Dialog for Student */}
      {showCancelDialog && (
        <Card style={[screenStyles.card, styles.dialogCard]}>
          <Text style={styles.dialogHeader}>Talebi İptal Etme Gerekçesi</Text>
          <Text style={screenStyles.body}>
            Lütfen iptal etme nedeninizi seçin. Varsa rezerve edilen stok tekrar
            kullanıma açılacaktır:
          </Text>

          <View style={{ gap: 8 }}>
            {studentCancelReasons.map((reason) => (
              <Pressable
                key={reason}
                accessibilityRole="button"
                onPress={() => setSelectedCancelReason(reason)}
                style={[
                  styles.reasonOption,
                  selectedCancelReason === reason && styles.reasonOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.reasonOptionText,
                    selectedCancelReason === reason &&
                      styles.reasonOptionTextSelected,
                  ]}
                >
                  {reason}
                </Text>
              </Pressable>
            ))}
          </View>

          <ActionButton
            title={busy ? 'İptal ediliyor…' : 'İptali Onayla'}
            loading={busy}
            disabled={busy}
            onPress={() => void handleCancel()}
          />
          <ActionButton
            title="Vazgeç"
            secondary
            disabled={busy}
            onPress={() => setShowCancelDialog(false)}
          />
        </Card>
      )}

      {/* Navigation Buttons */}
      <View style={styles.navRow}>
        <ActionButton
          title={
            isStudent ? 'Tüm taleplerime dön' : 'İşletme paneline dön'
          }
          secondary
          onPress={() => {
            if (isStudent) {
              router.navigate('/student/requests');
            } else {
              router.navigate('/business');
            }
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  statusExplText: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  nextStepText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  activeReservationCard: {
    backgroundColor: '#eff9f3',
    borderColor: '#73c996',
    gap: 8,
  },
  expiredCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#f87171',
    gap: 8,
  },
  reservationExpiry: {
    fontSize: 15,
    color: colors.ink,
  },
  reservationRuleNote: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  deliveryCard: {
    borderColor: colors.border,
    gap: 12,
  },
  codeContainer: {
    backgroundColor: '#f3faf5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bce3cb',
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  codeLabel: {
    fontSize: 14,
    color: colors.heading,
    fontWeight: '600',
  },
  codeDisplay: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 6,
    color: colors.heading,
  },
  codeExpiry: {
    fontSize: 13,
    color: colors.muted,
  },
  codeWarning: {
    fontSize: 12,
    color: '#825c17',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4,
  },
  codeInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    padding: 14,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    color: colors.ink,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f1',
    gap: 8,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '600',
    flex: 1.2,
    textAlign: 'right',
  },
  actionsContainer: {
    gap: 10,
    marginTop: 4,
  },
  dialogCard: {
    borderWidth: 2,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  dialogHeader: {
    color: colors.heading,
    fontSize: 18,
    fontWeight: '700',
  },
  reasonOption: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  reasonOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#eef6f1',
  },
  reasonOptionText: {
    fontSize: 14,
    color: colors.ink,
  },
  reasonOptionTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  navRow: {
    marginTop: 10,
  },
});
