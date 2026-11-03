import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Need } from '@/types/domain';
import type { NeedDraft, NeedFormErrors } from '@/features/student/types';

const toIsoDate = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

const initialForm: NeedDraft = {
  projectName: '',
  materialType: 'wood',
  widthMm: '',
  heightMm: '',
  thicknessMm: '',
  quantity: '',
  region: '',
  neededBy: toIsoDate(3),
};

const sanitizeNumericInput = (value: string) => value.replace(',', '.').replace(/[^\d.]/g, '');

const normalizePositiveNumber = (value: string): number | null => {
  const cleaned = value.trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const validateForm = (form: NeedDraft): NeedFormErrors => {
  const errors: NeedFormErrors = {};

  if (!form.projectName.trim()) {
    errors.projectName = 'Proje adı boş olamaz.';
  }

  if (!form.region.trim()) {
    errors.region = 'Bölge alanı zorunludur.';
  }

  const width = normalizePositiveNumber(form.widthMm);
  const height = normalizePositiveNumber(form.heightMm);
  const thickness = form.thicknessMm.trim() ? normalizePositiveNumber(form.thicknessMm) : null;
  const quantity = Number.parseInt(form.quantity, 10);

  if (width === null) {
    errors.widthMm = 'Genişlik pozitif sayı olmalıdır.';
  }
  if (height === null) {
    errors.heightMm = 'Yükseklik pozitif sayı olmalıdır.';
  }
  if (form.thicknessMm.trim() && thickness === null) {
    errors.thicknessMm = 'Kalınlık pozitif sayı olmalıdır.';
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    errors.quantity = 'Adet pozitif tam sayı olmalıdır.';
  }

  if (!form.neededBy || Number.isNaN(new Date(form.neededBy).getTime())) {
    errors.neededBy = 'Geçerli bir tarih girin.';
  }

  return errors;
};

export interface NeedFormProps {
  onSubmit: (need: Need) => Promise<void> | void;
}

export function NeedForm({ onSubmit }: NeedFormProps) {
  const [form, setForm] = useState<NeedDraft>(initialForm);
  const [errors, setErrors] = useState<NeedFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const hasAnyError = useMemo(() => Object.keys(errors).length > 0, [errors]);

  const updateField = <K extends keyof NeedDraft>(field: K, value: NeedDraft[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setSubmitError('');
  };

  const handleSave = async () => {
    const nextErrors = validateForm(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    setSubmitError('');

    try {
      const payload: Need = {
        id: 'draft',
        studentId: 'demo-student',
        projectName: form.projectName.trim(),
        materialType: form.materialType,
        widthMm: Number(form.widthMm.replace(',', '.')),
        heightMm: Number(form.heightMm.replace(',', '.')),
        thicknessMm: form.thicknessMm.trim() ? Number(form.thicknessMm.replace(',', '.')) : null,
        quantity: Number.parseInt(form.quantity, 10),
        region: form.region.trim(),
        neededBy: form.neededBy,
      };

      await onSubmit(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kaydetme sırasında bir hata oluştu.';
      setSubmitError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Proje adı</Text>
          <TextInput
            value={form.projectName}
            onChangeText={(value) => updateField('projectName', value)}
            placeholder="Örn. Mimari maket"
            autoCapitalize="words"
            style={[styles.input, errors.projectName ? styles.inputError : null]}
          />
          {errors.projectName ? <Text style={styles.error}>{errors.projectName}</Text> : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Malzeme</Text>
          <View style={styles.segmentedRow}>
            {(['wood', 'metal', 'plastic'] as const).map((option) => (
              <Pressable
                key={option}
                style={[styles.segmentButton, form.materialType === option ? styles.segmentButtonSelected : null]}
                onPress={() => updateField('materialType', option)}
              >
                <Text style={[styles.segmentLabel, form.materialType === option ? styles.segmentLabelSelected : null]}>
                  {option === 'wood' ? 'Ahşap' : option === 'metal' ? 'Metal' : 'Plastik'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.twoColumn}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Genişlik (mm)</Text>
            <TextInput
              value={form.widthMm}
              onChangeText={(value) => updateField('widthMm', sanitizeNumericInput(value))}
              keyboardType="numeric"
              style={[styles.input, errors.widthMm ? styles.inputError : null]}
            />
            {errors.widthMm ? <Text style={styles.error}>{errors.widthMm}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Yükseklik (mm)</Text>
            <TextInput
              value={form.heightMm}
              onChangeText={(value) => updateField('heightMm', sanitizeNumericInput(value))}
              keyboardType="numeric"
              style={[styles.input, errors.heightMm ? styles.inputError : null]}
            />
            {errors.heightMm ? <Text style={styles.error}>{errors.heightMm}</Text> : null}
          </View>
        </View>

        <View style={styles.twoColumn}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Kalınlık (mm)</Text>
            <TextInput
              value={form.thicknessMm}
              onChangeText={(value) => updateField('thicknessMm', sanitizeNumericInput(value))}
              keyboardType="numeric"
              placeholder="İsteğe bağlı"
              style={[styles.input, errors.thicknessMm ? styles.inputError : null]}
            />
            {errors.thicknessMm ? <Text style={styles.error}>{errors.thicknessMm}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Adet</Text>
            <TextInput
              value={form.quantity}
              onChangeText={(value) => updateField('quantity', value.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              style={[styles.input, errors.quantity ? styles.inputError : null]}
            />
            {errors.quantity ? <Text style={styles.error}>{errors.quantity}</Text> : null}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Bölge</Text>
          <TextInput
            value={form.region}
            onChangeText={(value) => updateField('region', value)}
            placeholder="Örn. İstanbul"
            autoCapitalize="words"
            style={[styles.input, errors.region ? styles.inputError : null]}
          />
          {errors.region ? <Text style={styles.error}>{errors.region}</Text> : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>İhtiyaç tarihi</Text>
          <TextInput
            value={form.neededBy}
            onChangeText={(value) => updateField('neededBy', value)}
            placeholder="YYYY-MM-DD"
            keyboardType="numeric"
            style={[styles.input, errors.neededBy ? styles.inputError : null]}
          />
          {errors.neededBy ? <Text style={styles.error}>{errors.neededBy}</Text> : null}
        </View>

        {submitError ? <Text style={styles.serverError}>{submitError}</Text> : null}

        <Pressable
          disabled={isSaving || hasAnyError}
          style={[styles.primaryButton, isSaving || hasAnyError ? styles.primaryButtonDisabled : null]}
          onPress={() => void handleSave()}
        >
          <Text style={styles.primaryButtonText}>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  formContainer: {
    gap: 18,
    paddingBottom: 32,
  },
  fieldGroup: { gap: 8 },
  label: {
    color: '#16493e',
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d6e2d8',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1d2f2a',
  },
  inputError: { borderColor: '#b65151' },
  error: {
    color: '#a63d3d',
    fontSize: 12,
  },
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
    backgroundColor: '#fff',
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
    color: '#16493e',
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#16493e',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#ffffff',
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
