import { AppError } from '@/services/contracts';
import { colors } from '@/theme/tokens';
import { Card } from '@/components/card';
import { materialLabels } from '@/lib/labels';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ActionButton, Feedback } from '@/components/ui';
import { StatePanel } from '@/components/state-panel';
import { useFocusedResource } from '@/hooks/use-focused-resource';
import { Screen } from '@/components/screen';
import { NeedForm } from '@/features/student/components/NeedForm';
import { studentService } from '@/features/student/service';
import type { Need } from '@/types/domain';
import { needIsReadOnly, requestsForNeed } from '@/features/student/need-list';

export default function NeedDetailScreen() {
  const { id, created } = useLocalSearchParams<{
    id: string;
    created?: string;
  }>();
  const routeId = Array.isArray(id) ? id[0] : id;
  const {
    data: need,
    loading,
    error,
    errorCode,
    reload,
  } = useFocusedResource(
    useCallback(async () => {
      if (!routeId)
        throw new AppError('NOT_FOUND', 'İhtiyaç bağlantısı geçersiz.');
      const item = await studentService.getNeed(routeId);
      if (!item)
        throw new AppError(
          'NOT_FOUND',
          'İhtiyaç bulunamadı veya bu hesaba ait değil.',
        );
      return item;
    }, [routeId]),
  );
  const {
    data: requestData,
    loading: requestsLoading,
    error: requestsError,
    reload: reloadRequests,
  } = useFocusedResource(
    useCallback(() => studentService.listMyRequests(), []),
  );
  const relatedRequests = routeId
    ? requestsForNeed(requestData ?? [], routeId)
    : [];
  const [editing, setEditing] = useState(false);
  const [updatedNeed, setUpdatedNeed] = useState<Need | null>(null);
  const [editNotice, setEditNotice] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState('');
  const archiveInFlight = useRef(false);
  const displayedNeed =
    updatedNeed?.id === routeId
      ? updatedNeed
      : need?.id === routeId
        ? need
        : null;

  const refreshUpdatedNeed = async () => {
    if (await reload()) {
      setUpdatedNeed(null);
      setEditNotice('İhtiyaç bilgileri güncellendi.');
    }
  };

  const handleUpdate = async (
    input: Parameters<typeof studentService.updateNeed>[1],
  ) => {
    if (!routeId) return;
    const updated = await studentService.updateNeed(routeId, input);
    setUpdatedNeed(updated);
    setEditing(false);
    setEditNotice('');
    if (await reload()) {
      setUpdatedNeed(null);
      setEditNotice('İhtiyaç bilgileri güncellendi.');
    } else {
      setEditNotice(
        'İhtiyaç güncellendi ancak sunucudan yeniden yüklenemedi. Gösterilen bilgiler kaydedilen son bilgilerdir.',
      );
    }
  };

  const handleArchive = async () => {
    if (!routeId || archiveInFlight.current) return;
    archiveInFlight.current = true;
    setArchiving(true);
    setArchiveError('');
    try {
      await studentService.archiveNeed(routeId);
      router.dismissTo({ pathname: '/student', params: { archived: '1' } });
    } catch (archiveFailure) {
      setArchiveError(
        archiveFailure instanceof Error
          ? archiveFailure.message
          : 'İhtiyaç arşivlenemedi. Lütfen yeniden deneyin.',
      );
      setConfirmArchive(false);
    } finally {
      archiveInFlight.current = false;
      setArchiving(false);
    }
  };

  if ((loading && !updatedNeed) || (!displayedNeed && (error || !loading))) {
    return (
      <Screen title="İhtiyaç detayı">
        <Feedback
          loading={loading}
          error={error}
          errorCode={errorCode}
          retry={() => void reload()}
        />
        <ActionButton
          title="İhtiyaçlarıma dön"
          secondary
          onPress={() => router.dismissTo('/student')}
        />
      </Screen>
    );
  }

  if (!displayedNeed) return null;

  return (
    <Screen title={displayedNeed.projectName}>
      {created === '1' && (
        <StatePanel
          kind="success"
          title="İhtiyacın kaydedildi"
          message="Şimdi ölçülerine uygun malzeme ilanlarını inceleyebilirsin."
        />
      )}
      {editNotice ? (
        <StatePanel
          kind="success"
          title="Düzenleme tamamlandı"
          message={editNotice}
          action={
            editNotice.startsWith('İhtiyaç güncellendi ancak')
              ? {
                  label: 'Bilgileri yenile',
                  onPress: () => void refreshUpdatedNeed(),
                }
              : undefined
          }
        />
      ) : null}
      {editing && !needIsReadOnly(displayedNeed) ? (
        <NeedForm
          key={displayedNeed.id}
          initialNeed={displayedNeed}
          submitLabel="Değişiklikleri kaydet"
          onCancel={() => setEditing(false)}
          onSubmit={handleUpdate}
        />
      ) : (
        <>
          {needIsReadOnly(displayedNeed) && (
            <StatePanel
              kind="success"
              title="Arşivlenmiş ihtiyaç"
              message="Bu ihtiyaç geçmiş kayıtları korunarak saklanıyor. Düzenlenemez veya yeni talep oluşturamaz."
            />
          )}
          <Card style={styles.card}>
            <Text style={styles.heading}>İhtiyaç özeti</Text>
            <Text style={styles.body}>
              Malzeme: {materialLabels[displayedNeed.materialType]}
            </Text>
            <Text style={styles.body}>
              Ölçü: {displayedNeed.widthMm} × {displayedNeed.heightMm} mm
            </Text>
            <Text style={styles.body}>
              Kalınlık:{' '}
              {displayedNeed.thicknessMm === null
                ? 'Doğrulanacak'
                : `${displayedNeed.thicknessMm} mm`}
            </Text>
            <Text style={styles.body}>Adet: {displayedNeed.quantity}</Text>
            <Text style={styles.body}>Bölge: {displayedNeed.region}</Text>
            <Text style={styles.body}>
              İhtiyaç tarihi: {displayedNeed.neededBy}
            </Text>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.heading}>Bu ihtiyacın talepleri</Text>
            <Feedback
              loading={requestsLoading}
              error={requestsError}
              retry={() => void reloadRequests()}
            />
            {!requestsLoading && !requestsError && relatedRequests.length === 0 ? (
              <StatePanel
                kind="empty"
                title="Henüz talep yok"
                message={
                  needIsReadOnly(displayedNeed)
                    ? 'Bu arşivlenmiş ihtiyaç için geçmiş talep bulunmuyor.'
                    : 'Uygun bir ilan bulduğunda oluşturduğun talepler burada görünür.'
                }
              />
            ) : null}
            {!requestsLoading &&
            !requestsError &&
            relatedRequests.length > 0 ? (
              <ActionButton
                title={`İlgili ${relatedRequests.length} talebi görüntüle`}
                secondary
                onPress={() =>
                  router.push({
                    pathname: '/student/requests',
                    params: { needId: displayedNeed.id },
                  })
                }
              />
            ) : null}
          </Card>

          {!needIsReadOnly(displayedNeed) && (
            <>
              <ActionButton
                title="İhtiyacı düzenle"
                disabled={archiving}
                onPress={() => {
                  setEditNotice('');
                  setEditing(true);
                }}
              />
              <ActionButton
                title="Uygun ilanları gör"
                disabled={archiving}
                onPress={() =>
                  router.push({
                    pathname: '/student/matches/[needId]',
                    params: { needId: displayedNeed.id },
                  })
                }
              />
              {relatedRequests.length === 0 ? (
                <ActionButton
                  title="Taleplerimi görüntüle"
                  secondary
                  disabled={requestsLoading || !!requestsError}
                  onPress={() =>
                    router.push({
                      pathname: '/student/requests',
                      params: { needId: displayedNeed.id },
                    })
                  }
                />
              ) : null}
              {archiveError ? (
                <StatePanel
                  kind="error"
                  title="İhtiyaç arşivlenemedi"
                  message={archiveError}
                  action={{
                    label: 'Tekrar dene',
                    onPress: () => {
                      setArchiveError('');
                      setConfirmArchive(true);
                    },
                  }}
                />
              ) : null}
              {confirmArchive ? (
                <Card style={styles.card}>
                  <Text style={styles.heading}>İhtiyaç arşivlensin mi?</Text>
                  <Text style={styles.body}>
                    Geçmiş talepler korunur. Bekleyen veya onaylanmış bir talep
                    varsa arşivleme sunucu tarafından reddedilir.
                  </Text>
                  <ActionButton
                    title={archiving ? 'Arşivleniyor…' : 'Evet, arşivle'}
                    loading={archiving}
                    disabled={archiving}
                    onPress={() => void handleArchive()}
                  />
                  <ActionButton
                    title="Vazgeç"
                    secondary
                    disabled={archiving}
                    onPress={() => setConfirmArchive(false)}
                  />
                </Card>
              ) : (
                <ActionButton
                  title="İhtiyacı arşivle"
                  secondary
                  onPress={() => {
                    setArchiveError('');
                    setConfirmArchive(true);
                  }}
                />
              )}
            </>
          )}
          <ActionButton
            title="İhtiyaç listesine dön"
            secondary
            disabled={archiving}
            onPress={() => router.dismissTo('/student')}
          />
        </>
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
    padding: 22,
    gap: 8,
  },
  heading: {
    color: colors.heading,
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 25,
  },
});
