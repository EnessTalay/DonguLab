import { colors } from '@/theme/tokens';
import { StatusBadge } from '@/components/status-badge';
import { formatDateTime } from '@/lib/dates';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Feedback } from '@/components/ui';
import { Screen } from '@/components/screen';
import { studentService } from '@/features/student/service';
import { useFocusedResource } from '@/hooks/use-focused-resource';
import { ChoiceChips } from '@/components/choice-chips';

export default function RequestsScreen() {
  const [deliveryCodes, setDeliveryCodes] = useState<
    Record<string, { code: string; expiresAt: string }>
  >({});
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [filter, setFilter] = useState<'active' | 'history' | 'all'>('active');
  const [now, setNow] = useState(() => Date.now());
  const { data, loading, error, reload } = useFocusedResource(
    useCallback(() => studentService.listMyRequests(), []),
  );
  const requests = data ?? [];
  const visibleRequests = requests.filter(
    (item) =>
      filter === 'all' ||
      (item.request.status === 'pending' ||
        item.request.status === 'approved') ===
        (filter === 'active'),
  );
  const hasCodes = Object.keys(deliveryCodes).length > 0;
  useEffect(() => {
    if (!hasCodes) return;
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [hasCodes]);

  const handleIssueCode = async (requestId: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setActionError('');
    try {
      const nextCode = await studentService.issueDeliveryCode(requestId);
      setDeliveryCodes((previous) => ({ ...previous, [requestId]: nextCode }));
      await reload();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'İşlem tamamlanamadı.',
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setActionError('');
    try {
      await studentService.cancelRequest(requestId);
      setConfirmCancel(null);
      setDeliveryCodes((previous) => {
        const next = { ...previous };
        delete next[requestId];
        return next;
      });
      await reload();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'İşlem tamamlanamadı.',
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <Screen title="Taleplerim">
        <Feedback loading />
      </Screen>
    );
  }

  return (
    <Screen title="Taleplerim">
      <Text style={styles.body}>
        Bekleyen talepler işletme onayı bekler. Onaylanan talebin teslim kodunu
        yalnız malzemeyi alırken işletmeyle paylaş.
      </Text>
      <ChoiceChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'active', label: 'Aktif talepler' },
          { value: 'history', label: 'Geçmiş' },
          { value: 'all', label: 'Tümü' },
        ]}
      />
      <ActionButton
        title={loading ? 'Yenileniyor…' : 'Talep durumlarını yenile'}
        secondary
        disabled={busy || loading}
        onPress={() => {
          setActionError('');
          void reload();
        }}
      />
      <Feedback error={error || actionError} />
      {!loading && !error && visibleRequests.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.heading}>Bu bölümde talep yok</Text>
          <Text style={styles.body}>
            İhtiyacına uygun bir ilan seçerek talep oluşturabilirsin. Tamamlanan
            ve iptal edilen talepler Geçmiş bölümünde yer alır.
          </Text>
          <Link href="/student" style={styles.body}>
            İhtiyaçlarımı incele →
          </Link>
        </View>
      ) : (
        !error &&
        visibleRequests.map(
          ({ request, listingTitle, projectName, statusLabel, expiresAt }) => {
            const storedCode = deliveryCodes[request.id];
            const code =
              storedCode && new Date(storedCode.expiresAt).getTime() > now
                ? storedCode
                : undefined;

            return (
              <View key={request.id} style={styles.card}>
                <StatusBadge status={request.status} label={statusLabel} />
                <Text style={styles.heading}>{projectName}</Text>
                <Text style={styles.body}>{listingTitle}</Text>
                <Text style={styles.body}>Adet: {request.quantity}</Text>
                {request.status === 'pending' && (
                  <Text style={styles.body}>
                    İşletme onayladığında stok senin için ayrılacak.
                  </Text>
                )}
                {request.status === 'approved' && expiresAt && (
                  <Text style={styles.warning}>
                    Rezervasyon sonu: {formatDateTime(expiresAt)}
                  </Text>
                )}

                {request.status === 'approved' && !code ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    style={[styles.primaryButton, busy && { opacity: 0.5 }]}
                    onPress={() => void handleIssueCode(request.id)}
                  >
                    <Text style={styles.primaryButtonText}>
                      {storedCode
                        ? 'Süresi dolan kodu yenile'
                        : 'Teslim kodu oluştur'}
                    </Text>
                  </Pressable>
                ) : null}

                {request.status === 'approved' && code ? (
                  <View style={styles.codeBox}>
                    <Text style={styles.codeLabel}>Teslim kodu</Text>
                    <Text style={styles.code}>{code.code}</Text>
                    <Text style={styles.body}>
                      Geçerlilik: {formatDateTime(code.expiresAt)}
                    </Text>
                    <Text style={styles.warning}>
                      Bu kodu işletmeye gösteriniz.
                    </Text>
                  </View>
                ) : null}

                {request.status === 'pending' ||
                request.status === 'approved' ? (
                  confirmCancel === request.id ? (
                    <View style={styles.codeBox}>
                      <Text style={styles.body}>
                        Talep iptal edilsin mi? Ayrılmış malzeme varsa yeniden
                        kullanıma açılır.
                      </Text>
                      <ActionButton
                        title="Evet, talebi iptal et"
                        disabled={busy}
                        onPress={() => void handleCancelRequest(request.id)}
                      />
                      <ActionButton
                        title="Vazgeç"
                        secondary
                        disabled={busy}
                        onPress={() => setConfirmCancel(null)}
                      />
                    </View>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy}
                      style={[styles.secondaryButton, busy && { opacity: 0.5 }]}
                      onPress={() => setConfirmCancel(request.id)}
                    >
                      <Text style={styles.secondaryButtonText}>İptal et</Text>
                    </Pressable>
                  )
                ) : null}
              </View>
            );
          },
        )
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 20,
    gap: 8,
    marginBottom: 16,
  },
  heading: {
    color: colors.heading,
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: colors.heading,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 15,
  },
  codeBox: {
    backgroundColor: '#f4f9f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dce8de',
    padding: 16,
    gap: 6,
  },
  codeLabel: {
    color: colors.heading,
    fontWeight: '700',
    fontSize: 14,
  },
  code: {
    color: colors.heading,
    fontWeight: '800',
    letterSpacing: 5,
    fontSize: 30,
  },
  warning: {
    color: '#7f6138',
    fontWeight: '600',
    fontSize: 13,
  },
  secondaryButton: {
    backgroundColor: '#eef3ef',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.heading,
    fontWeight: '700',
    fontSize: 15,
  },
});
