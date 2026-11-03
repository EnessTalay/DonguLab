import { ActionButton } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { InputField } from '@/components/input-field';
import { materialLabels } from '@/lib/labels';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSession } from '@/services/session';
import { createNeedDraftStorage } from '../draft-storage';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from 'expo-router';
import type { CreateNeedInput } from '@/services/contracts';
import type { Need } from '@/types/domain';
import {
  firstNeedFormError,
  needDraftHasChanges,
  needToDraft,
  parseNeedForm,
} from '../need-form';
import { istanbulDate } from '@/lib/dates';
import type { NeedDraft, NeedFormErrors } from '@/features/student/types';

const toIsoDate = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return istanbulDate(date);
};

const emptyForm = (): NeedDraft => ({
  projectName: '',
  materialType: 'wood',
  widthMm: '',
  heightMm: '',
  thicknessMm: '',
  quantity: '',
  region: '',
  neededBy: toIsoDate(3),
});

const sanitizeNumericInput = (value: string) =>
  value.replace(',', '.').replace(/[^\d.]/g, '');

export interface NeedFormProps {
  initialNeed?: Need;
  onSubmit: (need: CreateNeedInput) => Promise<void> | void;
  onCancel?: () => void;
  onSuccess?: () => void;
  submitLabel?: string;
}

export function NeedForm(props: NeedFormProps) {
  const { session } = useSession();
  const ownerId = session?.profile.id;
  return <NeedFormContent key={`${ownerId}:${props.initialNeed?.id ?? 'new'}`} {...props} ownerId={ownerId} />;
}

function NeedFormContent({
  initialNeed,
  onSubmit,
  onCancel,
  onSuccess,
  submitLabel = 'Kaydet',
  ownerId,
}: NeedFormProps & { ownerId?: string }) {
  const draftStorage = useMemo(() => ownerId ? createNeedDraftStorage(AsyncStorage, ownerId) : null, [ownerId]);
  const [draftReady, setDraftReady] = useState(!!initialNeed);
  const [storageWarning, setStorageWarning] = useState('');
  const [baseline] = useState(() =>
    initialNeed ? needToDraft(initialNeed) : emptyForm(),
  );
  const [form, setForm] = useState<NeedDraft>(() =>
    initialNeed ? needToDraft(initialNeed) : baseline,
  );
  const [errors, setErrors] = useState<NeedFormErrors>({});
  const [submitting, setIsSaving] = useState(false);
  const isSaving = submitting || !draftReady;
  const [submitError, setSubmitError] = useState('');
  const saving = useRef(false);
  const saved = useRef(false);
  const leavePromptOpen = useRef(false);
  const allowNextRemoval = useRef(false);
  const navigation = useNavigation();
  const materialInputRef = useRef<View>(null);
  const inputRefs = useRef<
    Partial<Record<Exclude<keyof NeedDraft, 'materialType'>, TextInput | null>>
  >({});
  const hasUnsavedChanges = needDraftHasChanges(form, baseline);

  useEffect(() => {
    if (initialNeed || !draftStorage) return;
    let active = true;
    void draftStorage.load(baseline).then(draft => {
      if (active) setForm(draft);
    }).catch(() => {
      if (active) setStorageWarning('Taslak yüklenemedi. Bu cihazdaki saklama alanını kontrol edin.');
    }).finally(() => { if (active) setDraftReady(true); });
    return () => { active = false; };
  }, [baseline, draftStorage, initialNeed]);

  const clearDraft = async () => {
    if (!initialNeed && draftStorage) {
      try { await draftStorage.clear(); }
      catch { setStorageWarning('Kayıt tamamlandı ancak cihazdaki taslak silinemedi.'); }
    }
  };

  const confirmDiscard = useCallback(
    (discard: () => void, stay: () => void = () => {}) => {
      const title = 'Formdan çıkılsın mı?';
      const message = 'Girilen bilgiler silinir. Formda kalmak ister misin?';
      if (Platform.OS === 'web') {
        if (window.confirm(`${title}\n${message}`)) discard();
        else stay();
        return;
      }
      Alert.alert(title, message, [
        { text: 'Formda kal', style: 'cancel', onPress: stay },
        { text: 'Çık ve sil', style: 'destructive', onPress: discard },
      ], { onDismiss: stay });
    },
    [],
  );

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (allowNextRemoval.current) {
          allowNextRemoval.current = false;
          return;
        }
        if (saved.current || (!hasUnsavedChanges && !isSaving)) return;
        event.preventDefault();
        if (isSaving || leavePromptOpen.current) return;

        leavePromptOpen.current = true;
        confirmDiscard(() => {
          leavePromptOpen.current = false;
          if (!initialNeed && draftStorage) void draftStorage.clear().catch(() => {});
          allowNextRemoval.current = true;
          navigation.dispatch(event.data.action);
        }, () => {
          leavePromptOpen.current = false;
        });
      }),
    [confirmDiscard, draftStorage, hasUnsavedChanges, initialNeed, isSaving, navigation],
  );

  const updateField = <K extends keyof NeedDraft>(
    field: K,
    value: NeedDraft[K],
  ) => {
    setForm((previous) => {
      const next = { ...previous, [field]: value };
      return next;
    });
    setErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      return next;
    });
    setSubmitError('');
  };

  useEffect(() => {
    if (!initialNeed && draftReady && draftStorage && !saved.current) {
      void draftStorage.save(form).catch(() => setStorageWarning('Taslak bu cihaza kaydedilemedi. Uygulamayı kapatırsanız bilgiler kaybolabilir.'));
    }
  }, [draftReady, draftStorage, form, initialNeed]);

  const handleSave = async () => {
    if (saving.current || !draftReady || saved.current) return;
    const parsed = parseNeedForm(form);
    setErrors(parsed.errors);
    if (!parsed.input) {
      const firstError = firstNeedFormError(parsed.errors);
      if (firstError === 'materialType') {
        materialInputRef.current?.focus();
      } else if (firstError) {
        inputRefs.current[firstError]?.focus();
      }
      return;
    }
    const input = parsed.input;

    saving.current = true;
    setIsSaving(true);
    setSubmitError('');

    try {
      await onSubmit(input);
      saved.current = true;
      await clearDraft();
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Kaydetme sırasında bir hata oluştu.';
      setSubmitError(message);
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (!hasUnsavedChanges) {
      onCancel?.();
      return;
    }
    confirmDiscard(() => {
      void clearDraft();
      onCancel?.();
    });
  };

  return (
    <View style={styles.formContainer}>
      {!draftReady ? <Text>Taslağın yükleniyor…</Text> : null}
      {storageWarning ? <Text accessibilityRole="alert">{storageWarning}</Text> : null}
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>
          Proje bilgileri
        </Text>
        <Text style={styles.sectionDescription}>
          İhtiyacını projenle ilişkilendirerek kolayca takip et.
        </Text>
        <InputField
          label="Proje adı"
          error={errors.projectName}
          accessibilityLabel="Proje adı"
          maxLength={200}
          editable={!isSaving}
          value={form.projectName}
          inputRef={(input) => {
            inputRefs.current.projectName = input;
          }}
          onChangeText={(value) => updateField('projectName', value)}
          placeholder="Örn. Mimari maket"
          autoCapitalize="words"
          style={[styles.input, errors.projectName ? styles.inputError : null]}
        />
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>
          Malzeme bilgileri
        </Text>
        <Text style={styles.sectionDescription}>
          İhtiyacına uygun malzeme türünü seç.
        </Text>
        <Text style={styles.label}>Malzeme türü</Text>
        <View style={styles.segmentedRow}>
          {(['wood', 'metal', 'plastic'] as const).map((option) => (
            <Pressable
              key={option}
              ref={option === 'wood' ? materialInputRef : undefined}
              accessibilityRole="button"
              accessibilityLabel={materialLabels[option]}
              accessibilityState={{ selected: form.materialType === option }}
              disabled={isSaving}
              style={[
                styles.segmentButton,
                form.materialType === option
                  ? styles.segmentButtonSelected
                  : null,
                errors.materialType ? styles.inputError : null,
              ]}
              onPress={() => updateField('materialType', option)}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  form.materialType === option
                    ? styles.segmentLabelSelected
                    : null,
                ]}
              >
                {materialLabels[option]}
              </Text>
            </Pressable>
          ))}
        </View>
        {errors.materialType ? (
          <Text accessibilityRole="alert" style={styles.fieldError}>
            {errors.materialType}
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>
          Ölçüler ve miktar
        </Text>
        <Text style={styles.sectionDescription}>
          Ölçüleri milimetre, miktarı adet olarak gir.
        </Text>
        <View style={styles.twoColumn}>
          <View style={[styles.fieldGroup, styles.column]}>
            <InputField
              label="Genişlik (mm)"
              error={errors.widthMm}
              accessibilityLabel="Genişlik, milimetre"
              editable={!isSaving}
              value={form.widthMm}
              inputRef={(input) => {
                inputRefs.current.widthMm = input;
              }}
              onChangeText={(value) =>
                updateField('widthMm', sanitizeNumericInput(value))
              }
              keyboardType="numeric"
              style={[styles.input, errors.widthMm ? styles.inputError : null]}
            />
          </View>
          <View style={[styles.fieldGroup, styles.column]}>
            <InputField
              label="Yükseklik (mm)"
              error={errors.heightMm}
              accessibilityLabel="Yükseklik, milimetre"
              editable={!isSaving}
              value={form.heightMm}
              inputRef={(input) => {
                inputRefs.current.heightMm = input;
              }}
              onChangeText={(value) =>
                updateField('heightMm', sanitizeNumericInput(value))
              }
              keyboardType="numeric"
              style={[styles.input, errors.heightMm ? styles.inputError : null]}
            />
          </View>
        </View>
        <View style={styles.twoColumn}>
          <View style={[styles.fieldGroup, styles.column]}>
            <InputField
              label="Kalınlık (mm)"
              error={errors.thicknessMm}
              accessibilityLabel="Kalınlık (mm), zorunlu"
              editable={!isSaving}
              value={form.thicknessMm}
              inputRef={(input) => {
                inputRefs.current.thicknessMm = input;
              }}
              onChangeText={(value) =>
                updateField('thicknessMm', sanitizeNumericInput(value))
              }
              keyboardType="numeric"
              placeholder="Örn. 6"
              style={[
                styles.input,
                errors.thicknessMm ? styles.inputError : null,
              ]}
            />
          </View>
          <View style={[styles.fieldGroup, styles.column]}>
            <InputField
              label="Adet"
              error={errors.quantity}
              accessibilityLabel="Malzeme adedi"
              editable={!isSaving}
              value={form.quantity}
              inputRef={(input) => {
                inputRefs.current.quantity = input;
              }}
              onChangeText={(value) =>
                updateField('quantity', value.replace(/[^0-9]/g, ''))
              }
              keyboardType="number-pad"
              style={[styles.input, errors.quantity ? styles.inputError : null]}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>
          Teslimat bölgesi ve ihtiyaç tarihi
        </Text>
        <Text style={styles.sectionDescription}>
          İlanları yakındaki malzemelere ve teslim zamanına göre eşleştirelim.
        </Text>
        <View style={styles.fieldGroup}>
          <InputField
            label="Teslim alacağın bölge"
            error={errors.region}
            accessibilityLabel="Teslim alacağın bölge"
            maxLength={120}
            editable={!isSaving}
            value={form.region}
            inputRef={(input) => {
              inputRefs.current.region = input;
            }}
            onChangeText={(value) => updateField('region', value)}
            placeholder="Örn. İstanbul"
            autoCapitalize="words"
            style={[styles.input, errors.region ? styles.inputError : null]}
          />
        </View>
        <View style={styles.fieldGroup}>
          <InputField
            label="Malzemeye ihtiyaç duyduğun tarih"
            error={errors.neededBy}
            accessibilityLabel="Malzemeye ihtiyaç duyduğun tarih, yıl ay gün"
            editable={!isSaving}
            value={form.neededBy}
            inputRef={(input) => {
              inputRefs.current.neededBy = input;
            }}
            onChangeText={(value) => updateField('neededBy', value)}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            maxLength={10}
            style={[styles.input, errors.neededBy ? styles.inputError : null]}
          />
        </View>
      </View>

      {submitError ? (
        <Text accessibilityRole="alert" style={styles.serverError}>
          {submitError}
        </Text>
      ) : null}
      <Text style={styles.note}>
        Tüm ölçüler milimetredir. Kaydetmek malzeme rezervasyonu yapmaz.
      </Text>

      <ActionButton
        title={isSaving ? 'Kaydediliyor...' : submitLabel}
        loading={isSaving}
        disabled={isSaving}
        onPress={() => void handleSave()}
        style={styles.primaryButton}
        textStyle={styles.primaryButtonText}
      />
      {onCancel && (
        <ActionButton
          title="Düzenlemeyi iptal et"
          secondary
          disabled={isSaving}
          onPress={handleCancel}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    gap: 18,
    paddingBottom: 32,
  },
  section: {
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sectionHeading: {
    color: colors.heading,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionDescription: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: -8,
  },
  fieldGroup: { gap: 8, flexGrow: 1, minWidth: 120 },
  column: { flex: 1, flexBasis: 140 },
  label: {
    color: colors.heading,
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d6e2d8',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1d2f2a',
  },
  inputError: { borderColor: '#b65151' },
  fieldError: { color: colors.error, fontSize: 13, lineHeight: 19 },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  segmentButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d6e2d8',
    backgroundColor: colors.surface,
  },
  segmentButtonSelected: {
    backgroundColor: '#e3f1e7',
    borderColor: '#58886d',
  },
  segmentLabel: {
    color: '#2b413a',
    fontWeight: '600',
  },
  segmentLabelSelected: {
    color: colors.heading,
  },
  twoColumn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  note: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: colors.heading,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  serverError: {
    color: '#a63d3d',
    backgroundColor: '#fbe8e8',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
});
