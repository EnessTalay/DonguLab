import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Screen, styles } from '@/components/screen';
import { ActionButton, Metrics } from '@/components/ui';
import { ChoiceChips } from '@/components/choice-chips';
import { AppError, services, type BusinessRequestView, type CreateListingInput } from '@/services';
import type { Listing, MaterialType, RequestStatus } from '@/types/domain';

const materialOptions: { value: MaterialType; label: string }[] = [
  { value: 'wood', label: 'Ahşap' },
  { value: 'metal', label: 'Metal' },
  { value: 'plastic', label: 'Plastik' },
];

const materialLabels: Record<MaterialType, string> = {
  wood: 'Ahşap',
  metal: 'Metal',
  plastic: 'Plastik',
};

const requestStatusLabels: Record<RequestStatus, string> = {
  pending: 'Beklemede',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  cancelled: 'İptal edildi',
  delivered: 'Teslim edildi',
};

const emptyForm = {
  title: '',
  widthMm: '',
  heightMm: '',
  thicknessMm: '',
  quantityOnHand: '',
  region: '',
  pickupDeadline: '',
};

type ListingFormField = keyof typeof emptyForm | 'materialType';
type ListingFormErrors = Partial<Record<ListingFormField, string>>;

function getErrorMessage(error: unknown) {
  if (error instanceof AppError) {
    const messages: Record<AppError['code'], string> = {
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
    return messages[error.code];
  }
  return 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
}

function parsePositiveNumber(value: string) {
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 && parsed < 1e9 ? parsed : null;
}

function formatIstanbulDate(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  const day = parts.find(part => part.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : '';
}

function dateFromIstanbulDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function getTodayInIstanbul() {
  return formatIstanbulDate(new Date());
}

function getPickerValue(value: string) {
  return isValidPickupDeadline(value) ? dateFromIstanbulDate(value) : dateFromIstanbulDate(getTodayInIstanbul());
}

function isValidPickupDeadline(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  return value >= getTodayInIstanbul();
}

function formatRequestExpiry(expiresAt: string) {
  const date = new Date(expiresAt);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString('tr-TR');
}

function getRequestErrorMessage(error: unknown) {
  if (error instanceof AppError) {
    const messages: Record<AppError['code'], string> = {
      UNAUTHENTICATED: 'Oturumunuz sona ermiş. Lütfen yeniden giriş yapın.',
      FORBIDDEN: 'Bu talep için işlem yapma yetkiniz bulunmuyor.',
      VALIDATION: 'Talep bilgileri geçersiz.',
      NOT_FOUND: 'Talep bulunamadı veya artık mevcut değil.',
      CONFLICT: 'Talep artık bu durumda işlenemiyor. Listeyi yenileyin.',
      OUT_OF_STOCK: 'Yeterli stok kalmadığı için talep onaylanamadı.',
      INCOMPATIBLE: 'İlan artık bu taleple eşleşmiyor.',
      EXPIRED: 'Talebin işlem süresi dolmuş.',
      INVALID_CODE: 'Teslim kodu geçersiz.',
      TOO_MANY_ATTEMPTS: 'İşlem sınırına ulaşıldı.',
      NETWORK: 'Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.',
      CONFIGURATION: 'Servis yapılandırması tamamlanmamış. Lütfen destek alın.',
      UNKNOWN: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
    };
    return messages[error.code];
  }
  return 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  optional = false,
  maxLength,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  optional?: boolean;
  maxLength?: number;
  error?: string;
}) {
  return (
    <View style={local.field}>
      <Text style={local.label}>{label}{optional ? ' (isteğe bağlı)' : ''}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={local.input}
      />
      {error && <Text accessibilityRole="alert" style={local.fieldError}>{error}</Text>}
    </View>
  );
}

export default function BusinessScreen() {
  const [section, setSection] = useState<'listings' | 'new' | 'requests'>('listings');
  const [listingFilter, setListingFilter] = useState<'all' | 'available' | 'expired'>('all');
  const [requestFilter, setRequestFilter] = useState<'active' | 'history' | 'all'>('active');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [listError, setListError] = useState('');
  const [incomingRequests, setIncomingRequests] = useState<BusinessRequestView[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestListError, setRequestListError] = useState('');
  const [requestActionMessage, setRequestActionMessage] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [activeRequestAction, setActiveRequestAction] = useState<{ requestId: string; action: 'approve' | 'reject' | 'delivery' } | null>(null);
  const [deliveryCodes, setDeliveryCodes] = useState<Record<string, string>>({});
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<ListingFormErrors>({});
  const [materialType, setMaterialType] = useState<MaterialType>('wood');
  const [iosDatePickerVisible, setIosDatePickerVisible] = useState(false);
  const [iosSelectedDate, setIosSelectedDate] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [listingCreatedNeedsRefresh, setListingCreatedNeedsRefresh] = useState(false);
  const visibleListings = listings.filter(listing => listingFilter === 'all' || (listingFilter === 'expired'
    ? listing.pickupDeadline < getTodayInIstanbul()
    : listing.pickupDeadline >= getTodayInIstanbul() && listing.quantityOnHand > listing.quantityReserved));
  const visibleRequests = incomingRequests.filter(item => requestFilter === 'all' ||
    ((item.request.status === 'pending' || item.request.status === 'approved') === (requestFilter === 'active')));
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success' | 'warning'; message: string } | null>(null);

  const loadListings = useCallback(async () => {
    try {
      const result = await services.listMyListings();
      setListings(result);
      setListError('');
      return true;
    } catch (error) {
      setListError(getErrorMessage(error));
      return false;
    } finally {
      setLoadingListings(false);
    }
  }, []);

  async function refreshListings() {
    setLoadingListings(true);
    const refreshed = await loadListings();
    if (refreshed && listingCreatedNeedsRefresh) {
      setForm(emptyForm);
      setFormErrors({});
      setMaterialType('wood');
      setListingCreatedNeedsRefresh(false);
      setFeedback({ type: 'success', message: 'İlanınız oluşturuldu ve ilan listeniz yenilendi.' });
    }
  }

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoadingListings(true);
    services.listMyListings()
      .then(result => {
        if (active) {
          setListings(result);
          setListError('');
        }
      })
      .catch(error => {
        if (active) setListError(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoadingListings(false);
      });
    return () => {
      active = false;
    };
  }, []));

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoadingRequests(true);
    services.listIncomingRequests()
      .then(result => {
        if (active) {
          setIncomingRequests(result);
          setRequestListError('');
        }
      })
      .catch(error => {
        if (active) setRequestListError(getRequestErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoadingRequests(false);
      });
    return () => {
      active = false;
    };
  }, []));

  async function refreshIncomingRequests() {
    setLoadingRequests(true);
    try {
      const result = await services.listIncomingRequests();
      setIncomingRequests(result);
      setRequestListError('');
    } catch (error) {
      setRequestListError(getRequestErrorMessage(error));
    } finally {
      setLoadingRequests(false);
    }
  }

  async function refreshRequestActionData() {
    setLoadingRequests(true);
    setLoadingListings(true);
    try {
      const [requestsResult, listingsResult] = await Promise.allSettled([
        Promise.resolve().then(() => services.listIncomingRequests()),
        Promise.resolve().then(() => services.listMyListings()),
      ]);

      if (requestsResult.status === 'fulfilled') {
        setIncomingRequests(requestsResult.value);
        setRequestListError('');
      } else {
        setRequestListError(getRequestErrorMessage(requestsResult.reason));
      }

      if (listingsResult.status === 'fulfilled') {
        setListings(listingsResult.value);
        setListError('');
      } else {
        setListError(getErrorMessage(listingsResult.reason));
      }

      return {
        requestsRefreshed: requestsResult.status === 'fulfilled',
        listingsRefreshed: listingsResult.status === 'fulfilled',
      };
    } finally {
      setLoadingRequests(false);
      setLoadingListings(false);
    }
  }

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

  async function handleRequestAction(requestId: string, action: 'approve' | 'reject') {
    if (activeRequestAction) return;
    setActiveRequestAction({ requestId, action });
    setRequestActionMessage(null);
    try {
      if (action === 'approve') {
        await services.approveRequest(requestId);
      } else {
        await services.rejectRequest(requestId);
      }

      const refreshResult = await refreshRequestActionData();
      const successMessage = action === 'approve' ? 'Talep onaylandı.' : 'Talep reddedildi.';
      const refreshWarning = getRefreshWarning(refreshResult, successMessage);
      setRequestActionMessage({
        type: 'success',
        message: refreshWarning ?? successMessage,
      });
    } catch (error) {
      setRequestActionMessage({ type: 'error', message: getRequestErrorMessage(error) });
    } finally {
      setActiveRequestAction(null);
    }
  }

  async function handleDeliveryConfirmation(requestId: string) {
    if (activeRequestAction) return;
    const code = deliveryCodes[requestId] ?? '';
    if (!code) {
      setRequestActionMessage({ type: 'error', message: 'Lütfen teslimat kodunu girin.' });
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setRequestActionMessage({ type: 'error', message: 'Teslimat kodu tam olarak 6 rakam olmalıdır.' });
      return;
    }

    setActiveRequestAction({ requestId, action: 'delivery' });
    setRequestActionMessage(null);
    try {
      await services.confirmDelivery(requestId, code);
      setDeliveryCodes(current => ({ ...current, [requestId]: '' }));
      const refreshResult = await refreshRequestActionData();
      const successMessage = 'Teslimat doğrulandı ve tamamlandı.';
      const refreshWarning = getRefreshWarning(refreshResult, successMessage);
      setRequestActionMessage({
        type: 'success',
        message: refreshWarning ?? successMessage,
      });
    } catch (error) {
      setRequestActionMessage({ type: 'error', message: getRequestErrorMessage(error) });
    } finally {
      setActiveRequestAction(null);
    }
  }

  const updateForm = (field: keyof typeof emptyForm) => (value: string) => {
    setForm(current => ({ ...current, [field]: value }));
    setFormErrors(current => {
      if (!current[field] || !isFormFieldValid(field, value)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  function isFormFieldValid(field: keyof typeof emptyForm, value: string) {
    if (field === 'title') return Boolean(value.trim()) && value.trim().length <= 200;
    if (field === 'region') return Boolean(value.trim()) && value.trim().length <= 120;
    if (field === 'widthMm' || field === 'heightMm') return parsePositiveNumber(value) !== null;
    if (field === 'thicknessMm') return !value.trim() || parsePositiveNumber(value) !== null;
    if (field === 'quantityOnHand') {
      const quantity = Number(value.trim());
      return Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 2147483647;
    }

    return isValidPickupDeadline(value);
  }

  function applyPickupDate(date: Date) {
    const pickupDeadline = formatIstanbulDate(date);
    if (!isValidPickupDeadline(pickupDeadline)) {
      setFormErrors(current => ({ ...current, pickupDeadline: 'Bugün veya daha ileri bir tarih seçin.' }));
      return;
    }
    updateForm('pickupDeadline')(pickupDeadline);
  }

  function openPickupDatePicker() {
    const value = getPickerValue(form.pickupDeadline);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        display: 'calendar',
        minimumDate: dateFromIstanbulDate(getTodayInIstanbul()),
        timeZoneName: 'Europe/Istanbul',
        onValueChange: (_event, selectedDate) => applyPickupDate(selectedDate),
      });
      return;
    }

    setIosSelectedDate(value);
    setIosDatePickerVisible(true);
  }

  function cancelIosDatePicker() {
    setIosDatePickerVisible(false);
    setIosSelectedDate(null);
  }

  function confirmIosDatePicker() {
    if (iosSelectedDate) applyPickupDate(iosSelectedDate);
    cancelIosDatePicker();
  }

  function createInput(): { input: CreateListingInput | null; errors: ListingFormErrors } {
    const title = form.title.trim();
    const region = form.region.trim();
    const widthMm = parsePositiveNumber(form.widthMm);
    const heightMm = parsePositiveNumber(form.heightMm);
    const thicknessMm = form.thicknessMm.trim() ? parsePositiveNumber(form.thicknessMm) : null;
    const quantityOnHand = Number(form.quantityOnHand.trim());
    const errors: ListingFormErrors = {};

    if (!title) errors.title = 'İlan başlığı zorunludur.';
    if (!materialOptions.some(option => option.value === materialType)) {
      errors.materialType = 'Lütfen geçerli bir malzeme türü seçin.';
    }
    if (widthMm === null) errors.widthMm = 'Genişlik sıfırdan büyük bir sayı olmalıdır.';
    if (heightMm === null) errors.heightMm = 'Yükseklik sıfırdan büyük bir sayı olmalıdır.';
    if (form.thicknessMm.trim() && thicknessMm === null) {
      errors.thicknessMm = 'Kalınlık sıfırdan büyük bir sayı olmalıdır veya boş bırakılmalıdır.';
    }
    if (!Number.isSafeInteger(quantityOnHand) || quantityOnHand <= 0 || quantityOnHand > 2147483647) {
      errors.quantityOnHand = 'Stok miktarı pozitif bir tam sayı olmalıdır.';
    }
    if (!region) errors.region = 'Bölge zorunludur.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.pickupDeadline)) {
      errors.pickupDeadline = 'Son teslim alma tarihini YYYY-AA-GG biçiminde girin.';
    } else if (!isValidPickupDeadline(form.pickupDeadline)) {
      errors.pickupDeadline = 'Bugün veya daha ileri bir tarih seçin.';
    }

    if (Object.keys(errors).length > 0 || widthMm === null || heightMm === null) {
      return { input: null, errors };
    }

    return {
      input: {
        title,
        materialType,
        widthMm,
        heightMm,
        thicknessMm,
        quantityOnHand,
        region,
        pickupDeadline: form.pickupDeadline,
      },
      errors,
    };
  }

  async function submitListing() {
    if (submitting || listingCreatedNeedsRefresh) return;
    setFeedback(null);
    const validation = createInput();
    setFormErrors(validation.errors);
    if (!validation.input) {
      return;
    }

    setSubmitting(true);
    try {
      await services.createListing(validation.input);
      setListingCreatedNeedsRefresh(true);
      setLoadingListings(true);
      const listingsRefreshed = await loadListings();
      if (listingsRefreshed) {
        setForm(emptyForm);
        setFormErrors({});
        setMaterialType('wood');
        setListingCreatedNeedsRefresh(false);
        setFeedback({ type: 'success', message: 'İlanınız oluşturuldu.' });
      } else {
        setFeedback({
          type: 'warning',
          message: 'İlan oluşturuldu ancak İlanlarım yenilenemedi. İlan yeniden oluşturulmayacak; listeyi yenilemek için aşağıdaki düğmeyi kullanın.',
        });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={local.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title="Malzemelerin değer kazansın">
        <ChoiceChips value={section} onChange={setSection} disabled={submitting || activeRequestAction !== null} options={[
          { value: 'listings', label: 'İlanlarım' }, { value: 'requests', label: 'Gelen talepler' }, { value: 'new', label: '+ Yeni ilan' },
        ]} />
        {!loadingListings && !loadingRequests && !listError && !requestListError && <Metrics items={[
          { label: 'Malzeme ilanı', value: listings.length },
          { label: 'Bekleyen talep', value: incomingRequests.filter(item => item.request.status === 'pending').length },
          { label: 'Teslim bekliyor', value: incomingRequests.filter(item => item.request.status === 'approved').length },
        ]} />}
        {section === 'new' && <>
        <Text style={styles.body}>Ölçüler milimetre cinsindedir. Kalınlık girilmeyen ilanlar öğrencilere gösterilir ancak talep alamaz.</Text>

        <View style={styles.card}>
          <Text style={styles.heading}>Yeni ilan oluştur</Text>
          <InputField
            label="İlan başlığı"
            value={form.title}
            onChangeText={updateForm('title')}
            placeholder="Örn. Atölyeden kontrplak parçaları"
            maxLength={200}
            error={formErrors.title}
          />

          <View style={local.field}>
            <Text style={local.label}>Malzeme türü</Text>
            <View style={local.options}>
              {materialOptions.map(option => {
                const selected = materialType === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setMaterialType(option.value);
                      setFormErrors(current => ({ ...current, materialType: undefined }));
                    }}
                    style={[local.option, selected && local.selectedOption]}
                  >
                    <Text style={[local.optionText, selected && local.selectedOptionText]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {formErrors.materialType && (
              <Text accessibilityRole="alert" style={local.fieldError}>{formErrors.materialType}</Text>
            )}
          </View>

          <View style={local.row}>
            <View style={local.halfField}>
              <InputField
                label="Genişlik (mm)"
                value={form.widthMm}
                onChangeText={updateForm('widthMm')}
                keyboardType="decimal-pad"
                error={formErrors.widthMm}
              />
            </View>
            <View style={local.halfField}>
              <InputField
                label="Yükseklik (mm)"
                value={form.heightMm}
                onChangeText={updateForm('heightMm')}
                keyboardType="decimal-pad"
                error={formErrors.heightMm}
              />
            </View>
          </View>
          <InputField
            label="Kalınlık (mm)"
            value={form.thicknessMm}
            onChangeText={updateForm('thicknessMm')}
            keyboardType="decimal-pad"
            optional
            error={formErrors.thicknessMm}
          />
          <InputField
            label="Stok miktarı"
            value={form.quantityOnHand}
            onChangeText={updateForm('quantityOnHand')}
            placeholder="Adet"
            keyboardType="number-pad"
            error={formErrors.quantityOnHand}
          />
          <InputField
            label="Bölge"
            value={form.region}
            onChangeText={updateForm('region')}
            placeholder="Örn. İstanbul"
            maxLength={120}
            error={formErrors.region}
          />
          {Platform.OS === 'web' ? (
            <InputField
              label="Son teslim alma tarihi"
              value={form.pickupDeadline}
              onChangeText={updateForm('pickupDeadline')}
              placeholder="YYYY-AA-GG"
              maxLength={10}
              error={formErrors.pickupDeadline}
            />
          ) : (
            <View style={local.field}>
              <Text style={local.label}>Son teslim alma tarihi</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Son teslim alma tarihi seç"
                accessibilityHint="Takvimi açar; bugün veya ileri bir tarih seçebilirsiniz."
                onPress={openPickupDatePicker}
                style={local.input}
              >
                <Text style={form.pickupDeadline ? local.dateValue : local.datePlaceholder}>
                  {form.pickupDeadline || 'Takvimden tarih seçin'}
                </Text>
              </Pressable>
              {formErrors.pickupDeadline && (
                <Text accessibilityRole="alert" style={local.fieldError}>{formErrors.pickupDeadline}</Text>
              )}
              {Platform.OS === 'ios' && iosDatePickerVisible && iosSelectedDate && (
                <View style={local.iosDatePicker}>
                  <DateTimePicker
                    accessibilityLabel="Son teslim alma takvimi"
                    display="spinner"
                    locale="tr-TR"
                    minimumDate={dateFromIstanbulDate(getTodayInIstanbul())}
                    mode="date"
                    onValueChange={(_event, selectedDate) => setIosSelectedDate(selectedDate)}
                    timeZoneName="Europe/Istanbul"
                    value={iosSelectedDate}
                  />
                  <View style={local.datePickerActions}>
                    <Pressable accessibilityRole="button" onPress={cancelIosDatePicker} style={local.datePickerAction}>
                      <Text style={local.retryText}>İptal</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={confirmIosDatePicker} style={local.datePickerAction}>
                      <Text style={local.retryText}>Seç</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}

          {feedback && (
            <View style={local.feedbackGroup}>
              <Text
                accessibilityRole="alert"
                style={feedback.type === 'success' ? local.success : local.error}
              >
                {feedback.message}
              </Text>
              {feedback.type === 'warning' && (
                <Pressable
                  accessibilityRole="button"
                  disabled={loadingListings}
                  onPress={() => void refreshListings()}
                  style={local.retryButton}
                >
                  <Text style={local.retryText}>İlanlarımı yenile</Text>
                </Pressable>
              )}
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={submitting || listingCreatedNeedsRefresh}
            onPress={() => void submitListing()}
            style={[local.submitButton, (submitting || listingCreatedNeedsRefresh) && local.disabledButton]}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={local.submitText}>{listingCreatedNeedsRefresh ? 'İlan oluşturuldu' : 'İlanı oluştur'}</Text>}
          </Pressable>
        </View>

        </>}
        {section === 'listings' && <>
        <ActionButton title="Stokları yenile" secondary disabled={loadingListings} onPress={() => void refreshListings()} />
        <ChoiceChips value={listingFilter} onChange={setListingFilter} options={[
          { value: 'all', label: 'Tümü' }, { value: 'available', label: 'Kullanılabilir' }, { value: 'expired', label: 'Süresi geçmiş' },
        ]} />
        <View style={local.listHeading}>
          <Text style={styles.heading}>İlanlarım</Text>
          {loadingListings && <ActivityIndicator accessibilityLabel="İlanlar yükleniyor" color="#16493e" />}
        </View>
        {!!listError && (
          <View style={local.listError}>
            <Text accessibilityRole="alert" style={local.error}>{listError}</Text>
            <Pressable accessibilityRole="button" onPress={() => void refreshListings()} style={local.retryButton}>
              <Text style={local.retryText}>Yeniden dene</Text>
            </Pressable>
          </View>
        )}
        {!loadingListings && !listError && listings.length === 0 && (
          <Text style={styles.note}>Henüz ilanınız yok. Yeni ilan sekmesinden ilk malzemenizi ekleyin.</Text>
        )}
        {!loadingListings && !listError && listings.length > 0 && visibleListings.length === 0 && <Text style={styles.note}>Bu filtreye uygun ilan yok.</Text>}
        {!loadingListings && !listError && visibleListings.map(listing => (
          <View key={listing.id} style={styles.card}>
            <Text style={styles.heading}>{listing.title}</Text>
            <Text style={styles.body}>{listing.pickupDeadline < getTodayInIstanbul() ? 'Süresi geçmiş' : listing.quantityOnHand <= listing.quantityReserved ? 'Kullanılabilir stok yok' : listing.thicknessMm === null ? 'Talep için kalınlık bilgisi eksik' : 'Talebe açık'}</Text>
            <Text style={styles.body}>
              {materialLabels[listing.materialType]} · {listing.widthMm} × {listing.heightMm} mm
              {listing.thicknessMm === null ? ' · Kalınlık belirtilmemiş' : ` · ${listing.thicknessMm} mm kalınlık`}
            </Text>
            <Text style={styles.body}>
              Toplam: {listing.quantityOnHand} · Ayrılmış: {listing.quantityReserved} · Kullanılabilir: {listing.quantityOnHand - listing.quantityReserved}
            </Text>
            <Text style={styles.body}>{listing.region} · Son teslim alma: {listing.pickupDeadline}</Text>
          </View>
        ))}

        </>}
        {section === 'requests' && <>
        <ActionButton title="Talepleri ve stokları yenile" secondary disabled={loadingRequests || loadingListings || activeRequestAction !== null} onPress={() => void refreshRequestActionData()} />
        <ChoiceChips value={requestFilter} onChange={setRequestFilter} options={[
          { value: 'active', label: 'İşlem bekleyen' }, { value: 'history', label: 'Geçmiş' }, { value: 'all', label: 'Tümü' },
        ]} />
        <View style={local.listHeading}>
          <Text style={styles.heading}>Gelen talepler</Text>
          {loadingRequests && <ActivityIndicator accessibilityLabel="Talepler yükleniyor" color="#16493e" />}
        </View>
        {requestActionMessage && (
          <Text
            accessibilityRole="alert"
            style={requestActionMessage.type === 'error' ? local.error : local.success}
          >
            {requestActionMessage.message}
          </Text>
        )}
        {!!requestListError && (
          <View style={local.listError}>
            <Text accessibilityRole="alert" style={local.error}>{requestListError}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={loadingRequests}
              onPress={() => void refreshIncomingRequests()}
              style={local.retryButton}
            >
              <Text style={local.retryText}>Talepleri yeniden yükle</Text>
            </Pressable>
          </View>
        )}
        {!loadingRequests && !requestListError && incomingRequests.length === 0 && (
          <Text style={styles.note}>Henüz gelen talep yok. Yeni talepler burada görünecek.</Text>
        )}
        {!loadingRequests && !requestListError && incomingRequests.length > 0 && visibleRequests.length === 0 && <Text style={styles.note}>Bu filtrede talep bulunmuyor.</Text>}
        {!loadingRequests && !requestListError && visibleRequests.map(({ request, listingTitle, projectName, expiresAt }) => {
          const pending = request.status === 'pending';
          const actionInProgress = activeRequestAction?.requestId === request.id;
          return (
            <View key={request.id} style={styles.card}>
              <View style={local.requestTitleRow}>
                <Text style={[styles.heading, local.requestTitle]}>{listingTitle}</Text>
                <View style={[local.statusBadge, request.status === 'pending' && local.pendingBadge]}>
                  <Text style={[local.statusText, request.status === 'pending' && local.pendingStatusText]}>
                    {requestStatusLabels[request.status]}
                  </Text>
                </View>
              </View>
              <Text style={styles.body}>Öğrenci projesi: {projectName}</Text>
              <Text style={styles.body}>Talep edilen miktar: {request.quantity} adet</Text>
              {expiresAt && formatRequestExpiry(expiresAt) && (
                <Text style={styles.body}>Rezervasyon sonu: {formatRequestExpiry(expiresAt)}</Text>
              )}
              {pending && (
                <View style={local.requestActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={activeRequestAction !== null}
                    onPress={() => void handleRequestAction(request.id, 'approve')}
                    style={[local.actionButton, local.approveButton, activeRequestAction !== null && local.disabledButton]}
                  >
                    {actionInProgress && activeRequestAction?.action === 'approve'
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={local.actionButtonText}>Onayla</Text>}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={activeRequestAction !== null}
                    onPress={() => void handleRequestAction(request.id, 'reject')}
                    style={[local.actionButton, local.rejectButton, activeRequestAction !== null && local.disabledButton]}
                  >
                    {actionInProgress && activeRequestAction?.action === 'reject'
                      ? <ActivityIndicator color="#8b2f24" />
                      : <Text style={local.rejectButtonText}>Reddet</Text>}
                  </Pressable>
                </View>
              )}
              {request.status === 'approved' && (
                <View style={local.deliverySection}>
                  <Text style={local.label}>Teslimat kodu</Text>
                  <TextInput
                    accessibilityLabel="6 haneli teslimat kodu"
                    value={deliveryCodes[request.id] ?? ''}
                    onChangeText={value => {
                      const digits = value.replace(/\D/g, '').slice(0, 6);
                      setDeliveryCodes(current => ({ ...current, [request.id]: digits }));
                    }}
                    editable={activeRequestAction?.requestId !== request.id}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="6 rakam"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="oneTimeCode"
                    style={[
                      local.deliveryInput,
                      activeRequestAction?.requestId === request.id && local.disabledButton,
                    ]}
                  />
                  <Text style={local.codeHint}>Öğrencinin paylaştığı 6 rakamlı kodu girin.</Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={activeRequestAction !== null}
                    onPress={() => void handleDeliveryConfirmation(request.id)}
                    style={[
                      local.actionButton,
                      local.approveButton,
                      activeRequestAction !== null && local.disabledButton,
                    ]}
                  >
                    {actionInProgress && activeRequestAction?.action === 'delivery'
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={local.actionButtonText}>Teslimatı doğrula</Text>}
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
        </>}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const local = StyleSheet.create({
  container: { flex: 1 },
  field: { gap: 7 },
  feedbackGroup: { gap: 8 },
  fieldError: { color: '#8b2f24', fontSize: 13, lineHeight: 19 },
  label: { color: '#16493e', fontSize: 15, fontWeight: '600' },
  dateValue: { color: '#243c32', fontSize: 16 },
  datePlaceholder: { color: '#808c83', fontSize: 16 },
  iosDatePicker: { borderRadius: 10, backgroundColor: '#fff', overflow: 'hidden' },
  datePickerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24, paddingHorizontal: 16 },
  datePickerAction: { paddingVertical: 12 },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a8bdae',
    backgroundColor: '#fff',
    color: '#243c32',
    fontSize: 16,
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#a8bdae',
    backgroundColor: '#fff',
  },
  selectedOption: { borderColor: '#16493e', backgroundColor: '#16493e' },
  optionText: { color: '#16493e', fontSize: 15, fontWeight: '600' },
  selectedOptionText: { color: '#fff' },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  submitButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#16493e',
  },
  disabledButton: { opacity: 0.65 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { color: '#8b2f24', fontSize: 14, lineHeight: 21 },
  success: { color: '#16493e', fontSize: 14, lineHeight: 21 },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listError: { gap: 10, padding: 16, borderRadius: 12, backgroundColor: '#fff3d7' },
  retryButton: { alignSelf: 'flex-start', paddingVertical: 8 },
  retryText: { color: '#16493e', fontSize: 15, fontWeight: '700' },
  requestTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  requestTitle: { flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: '#e8eee8' },
  pendingBadge: { backgroundColor: '#fff3d7' },
  statusText: { color: '#476957', fontSize: 12, fontWeight: '700' },
  pendingStatusText: { color: '#6b582e' },
  requestActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionButton: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  approveButton: { backgroundColor: '#16493e' },
  rejectButton: { borderWidth: 1, borderColor: '#8b2f24', backgroundColor: '#fff' },
  actionButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  rejectButtonText: { color: '#8b2f24', fontSize: 15, fontWeight: '700' },
  deliverySection: { gap: 8, marginTop: 4, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#dbe5da' },
  deliveryInput: {
    minHeight: 54,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a8bdae',
    backgroundColor: '#fff',
    color: '#16493e',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
  },
  codeHint: { color: '#6b7b70', fontSize: 13, lineHeight: 19 },
});
