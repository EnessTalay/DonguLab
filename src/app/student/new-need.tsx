import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/screen';
import type { Need } from '@/types/domain';
import { studentDemoService } from '@/features/student/service';
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

const normalizeNumber = (value: string) => value.replace(',', '.');

const parsePositiveNumber = (value: string) => {
  const normalized = normalizeNumber(value).trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const validateForm = (form: NeedDraft): NeedFormErrors => {
  const errors: NeedFormErrors = {};

  if (!form.projectName.trim()) {
    errors.projectName = 'Proje adı boş olamaz.';
  }

  const width = parsePositiveNumber(form.widthMm);
  const height = parsePositiveNumber(form.heightMm);
  const thickness = form.thicknessMm.trim() ? parsePositiveNumber(form.thicknessMm) : null;
  const quantity = Number.parseInt(form.quantity, 10);

  if (width === null) errors.widthMm = 'Genişlik pozitif sayı olmalı.';
  if (height === null) errors.heightMm = 'Yükseklik pozitif sayı olmalı.';
  if (form.thicknessMm.trim() && thickness === null) {
    errors.thicknessMm = 'Kalınlık pozitif sayı olmalı.';
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    errors.quantity = 'Adet pozitif tam sayı olmalı.';
  }
  if (!form.region.trim()) {
    errors.region = 'Bölge gerekli.';
  }

  const dateValue = new Date(form.neededBy);
  if (!form.neededBy || Number.isNaN(dateValue.getTime())) {
    errors.neededBy = 'Geçerli bir tarih seç.';
  }

  return errors;
};

export default function NewNeedScreen() {
  const [form, setForm] = useState<NeedDraft>(initialForm);
  const [errors, setErrors] = useState<NeedFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  const updateField = <K extends keyof NeedDraft>(field: K, value: NeedDraft[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setServerError('');
  };

  const handleSave = async () => {
    const nextErrors = validateForm(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    setServerError('');

    try {
      const payload: Need = {
        id: 'draft',
        studentId: 'demo-student',
        projectName: form.projectName.trim(),
        materialType: form.materialType,
        widthMm: Number(normalizeNumber(form.widthMm)),
        heightMm: Number(normalizeNumber(form.heightMm)),
        thicknessMm: form.thicknessMm.trim() ? Number(normalizeNumber(form.thicknessMm)) : null,
        quantity: Number.parseInt(form.quantity, 10),
        region: form.region.trim(),
        neededBy: form.neededBy,
      };

      const createdNeed = await studentDemoService.createNeed(payload);
      router.replace({ pathname: '/student/needs/[id]', params: { id: createdNeed.id } });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Kaydetme sırasında bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen title="İhtiyacını oluştur">
      <Text style={styles.note}>Örnek mod: veriler cihaz içinde geçici olarak tutulur. Sunucu kaydı ve gerçek kullanıcı bilgisi burada kullanılmaz.</Text>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Proje adı</Text>
            <TextInput
              value={form.projectName}
              onChangeText={(value) => updateField('projectName', value)}
              placeholder="Örn. Mimari maket"
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
                onChangeText={(value) => updateField('widthMm', value.replace(',', '.'))}
                keyboardType="numeric"
                style={[styles.input, errors.widthMm ? styles.inputError : null]}
              />
              {errors.widthMm ? <Text style={styles.error}>{errors.widthMm}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Yükseklik (mm)</Text>
              <TextInput
                value={form.heightMm}
                onChangeText={(value) => updateField('heightMm', value.replace(',', '.'))}
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
                onChangeText={(value) => updateField('thicknessMm', value.replace(',', '.'))}
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

          {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

          <Pressable
            disabled={isSaving}
            style={[styles.primaryButton, isSaving ? styles.primaryButtonDisabled : null]}
            onPress={handleSave}
          >
            <Text style={styles.primaryButtonText}>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    color: '#6b582e',
    backgroundColor: '#fff3d7',
    padding: 16,
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 22,
  },
  formContainer: {
    gap: 18,
    paddingBottom: 32,
  },
  fieldGroup: {
    gap: 8,
  },
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
  inputError: {
    borderColor: '#b65151',
  },
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
    backgroundColor: '#ffffff',
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
    fontSize: 14,
    backgroundColor: '#fbe8e8',
    borderRadius: 12,
    padding: 12,
  },
});
