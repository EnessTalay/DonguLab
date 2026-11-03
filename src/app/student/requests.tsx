import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { studentDemoService, type StudentRequestView } from '@/features/student/service';

export default function RequestsScreen() {
  const [requests, setRequests] = useState<StudentRequestView[]>([]);
  const [deliveryCodes, setDeliveryCodes] = useState<Record<string, { code: string; expiresAt: string }>>({});
  const [loading, setLoading] = useState(true);

  const refreshRequests = useCallback(async () => {
    const nextRequests = await studentDemoService.listMyRequests();
    const nextCodes: Record<string, { code: string; expiresAt: string }> = {};

    for (const item of nextRequests) {
      const code = await studentDemoService.getDeliveryCode(item.request.id);
      if (code) nextCodes[item.request.id] = code;
    }

    setRequests(nextRequests);
    setDeliveryCodes(nextCodes);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      await refreshRequests();
      if (!active) return;
    };

    void load();
    return () => {
      active = false;
    };
  }, [refreshRequests]);

  const handleIssueCode = async (requestId: string) => {
    const nextCode = await studentDemoService.issueDeliveryCode(requestId);
    setDeliveryCodes((previous) => ({ ...previous, [requestId]: nextCode }));
    await refreshRequests();
  };

  const handleCancelRequest = async (requestId: string) => {
    await studentDemoService.cancelRequest(requestId);
    await refreshRequests();
  };

  if (loading) {
    return (
      <Screen title="Taleplerim">
        <Text style={styles.loading}>Talepler yükleniyor...</Text>
      </Screen>
    );
  }

  return (
    <Screen title="Taleplerim">
      {requests.length === 0 ? (
        <Text style={styles.empty}>Henüz talep oluşturulmadı.</Text>
      ) : (
        requests.map(({ request, listingTitle, projectName, statusLabel }) => {
          const code = deliveryCodes[request.id];

          return (
            <View key={request.id} style={styles.card}>
              <Text style={styles.heading}>{projectName}</Text>
              <Text style={styles.body}>{listingTitle}</Text>
              <Text style={styles.body}>Durum: {statusLabel}</Text>
              <Text style={styles.body}>Adet: {request.quantity}</Text>

              {request.status === 'approved' && !code ? (
                <Pressable style={styles.primaryButton} onPress={() => void handleIssueCode(request.id)}>
                  <Text style={styles.primaryButtonText}>Kodu oluştur</Text>
                </Pressable>
              ) : null}

              {code ? (
                <View style={styles.codeBox}>
                  <Text style={styles.codeLabel}>Teslim kodu</Text>
                  <Text style={styles.code}>{code.code}</Text>
                  <Text style={styles.body}>Bitiş: {new Date(code.expiresAt).toLocaleString('tr-TR')}</Text>
                </View>
              ) : null}

              {request.status !== 'cancelled' && request.status !== 'delivered' ? (
                <Pressable style={styles.secondaryButton} onPress={() => void handleCancelRequest(request.id)}>
                  <Text style={styles.secondaryButtonText}>İptal et</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    color: '#3d5148',
    fontSize: 16,
  },
  empty: {
    color: '#3d5148',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe5da',
    padding: 20,
    gap: 8,
    marginBottom: 16,
  },
  heading: {
    color: '#16493e',
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    color: '#3d5148',
    fontSize: 15,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#16493e',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  codeBox: {
    backgroundColor: '#edf5ee',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  codeLabel: {
    color: '#16493e',
    fontWeight: '700',
    fontSize: 14,
  },
  code: {
    color: '#16493e',
    fontWeight: '800',
    letterSpacing: 3,
    fontSize: 26,
  },
  secondaryButton: {
    backgroundColor: '#eef3ef',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe5da',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#16493e',
    fontWeight: '700',
    fontSize: 15,
  },
});
