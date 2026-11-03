import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { CreateNeedInput } from '@/services/contracts';
import { parseNeedForm } from '../need-form';
import { istanbulDate } from '@/services/validation';
import type { NeedDraft, NeedFormErrors } from '@/features/student/types';

const toIsoDate = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return istanbulDate(date);
};

const initialForm = (): NeedDraft => ({
  projectName: '',
  materialType: 'wood',
  widthMm: '',
  heightMm: '',
  thicknessMm: '',
  quantity: '',
  region: '',
  neededBy: toIsoDate(3),
});

const sanitizeNumericInput = (value: string) => value.replace(',', '.').replace(/[^\d.]/g, '');

export interface NeedFormProps {
  onSubmit: (need: CreateNeedInput) => Promise<void> | void;
}

export function NeedForm({ onSubmit }: NeedFormProps) {
  const [form, setForm] = useState<NeedDraft>(initialForm);
  const [errors, setErrors] = useState<NeedFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');


  const updateField = <K extends keyof NeedDraft>(field: K, value: NeedDraft[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => { const next = { ...previous }; delete next[field]; return next; });
    setSubmitError('');
  };

  const handleSave = async () => {
    if (isSaving) return;
    const parsed = parseNeedForm(form);
    setErrors(parsed.errors);
    if (!parsed.input) return;

    setIsSaving(true);
    setSubmitError('');

    try {
      await onSubmit(parsed.input);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kaydetme sırasında bir hata oluştu.';
      setSubmitError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrapper}>
      <View style={styles.formContainer}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Proje adı</Text>
          <TextInput
            accessibilityLabel="Proje adı"
            maxLength={200}
            editable={!isSaving}
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
                accessibilityRole="button"
                accessibilityState={{ selected: form.materialType === option }}
                disabled={isSaving}
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
          <View style={[styles.fieldGroup, styles.column]}>
            <Text style={styles.label}>Genişlik (mm)</Text>
            <TextInput
              accessibilityLabel="Genişlik, milimetre"
            editable={!isSaving}
              value={form.widthMm}
              onChangeText={(value) => updateField('widthMm', sanitizeNumericInput(value))}
              keyboardType="numeric"
              style={[styles.input, errors.widthMm ? styles.inputError : null]}
            />
            {errors.widthMm ? <Text style={styles.error}>{errors.widthMm}</Text> : null}
          </View>

          <View style={[styles.fieldGroup, styles.column]}>
            <Text style={styles.label}>Yükseklik (mm)</Text>
            <TextInput
              accessibilityLabel="Yükseklik, milimetre"
            editable={!isSaving}
              value={form.heightMm}
              onChangeText={(value) => updateField('heightMm', sanitizeNumericInput(value))}
              keyboardType="numeric"
              style={[styles.input, errors.heightMm ? styles.inputError : null]}
            />
            {errors.heightMm ? <Text style={styles.error}>{errors.heightMm}</Text> : null}
          </View>
        </View>

        <View style={styles.twoColumn}>
          <View style={[styles.fieldGroup, styles.column]}>
            <Text style={styles.label}>Kalınlık (mm)</Text>
            <TextInput
              accessibilityLabel="Kalınlık, milimetre, zorunlu"
            editable={!isSaving}
              value={form.thicknessMm}
              onChangeText={(value) => updateField('thicknessMm', sanitizeNumericInput(value))}
              keyboardType="numeric"
              placeholder="Örn. 6"
              style={[styles.input, errors.thicknessMm ? styles.inputError : null]}
            />
            {errors.thicknessMm ? <Text style={styles.error}>{errors.thicknessMm}</Text> : null}
          </View>

          <View style={[styles.fieldGroup, styles.column]}>
            <Text style={styles.label}>Adet</Text>
            <TextInput
              accessibilityLabel="Malzeme adedi"
            editable={!isSaving}
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
            accessibilityLabel="Bölge"
            maxLength={120}
            editable={!isSaving}
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
            accessibilityLabel="İhtiyaç tarihi, yıl ay gün"
            editable={!isSaving}
            value={form.neededBy}
            onChangeText={(value) => updateField('neededBy', value)}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            maxLength={10}
            style={[styles.input, errors.neededBy ? styles.inputError : null]}
          />
          {errors.neededBy ? <Text style={styles.error}>{errors.neededBy}</Text> : null}
        </View>

        {submitError ? <Text style={styles.serverError}>{submitError}</Text> : null}
        <Text style={styles.label}>Tüm ölçüler milimetredir. İhtiyaç kaydı oluşturmak malzeme rezervasyonu yapmaz.</Text>

        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          style={[styles.primaryButton, isSaving ? styles.primaryButtonDisabled : null]}
          onPress={() => void handleSave()}
        >
          <Text style={styles.primaryButtonText}>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  formContainer: {
    gap: 18,
    paddingBottom: 32,
  },
  fieldGroup: { gap: 8, flexGrow: 1, minWidth: 120 },
  column: { flex: 1, flexBasis: 140 },
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
    flexWrap: 'wrap',
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
