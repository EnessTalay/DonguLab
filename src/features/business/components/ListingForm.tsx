import { ActionButton } from '@/components/ui';
import { PickupDateField } from './PickupDateField';
import { Pressable, Text, View } from 'react-native';
import { styles } from '@/components/screen';
import { InputField } from '@/components/input-field';
import { materialOptions } from '@/lib/labels';
import { local } from '../styles';
import type { BusinessModel } from '../use-business';

export function ListingForm({
  model,
}: {
  model: Pick<
    BusinessModel,
    | 'loadingListings'
    | 'form'
    | 'formErrors'
    | 'setFormErrors'
    | 'materialType'
    | 'setMaterialType'
    | 'submitting'
    | 'listingCreatedNeedsRefresh'
    | 'feedback'
    | 'refreshListings'
    | 'updateForm'
    | 'submitListing'
    | 'openPickupDatePicker'
    | 'iosDatePickerVisible'
    | 'iosSelectedDate'
    | 'setIosSelectedDate'
    | 'cancelIosDatePicker'
    | 'confirmIosDatePicker'
  >;
}) {
  const {
    loadingListings,
    form,
    formErrors,
    setFormErrors,
    materialType,
    setMaterialType,
    submitting,
    listingCreatedNeedsRefresh,
    feedback,
    refreshListings,
    updateForm,
    submitListing,
  } = model;
  return (
    <>
      <Text style={styles.body}>
        Ölçüler milimetre cinsindedir. Kalınlık girilmeyen ilanlar öğrencilere
        gösterilir ancak talep alamaz.
      </Text>

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
            {materialOptions.map((option) => {
              const selected = materialType === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setMaterialType(option.value);
                    setFormErrors((current) => ({
                      ...current,
                      materialType: undefined,
                    }));
                  }}
                  style={[local.option, selected && local.selectedOption]}
                >
                  <Text
                    style={[
                      local.optionText,
                      selected && local.selectedOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {formErrors.materialType && (
            <Text accessibilityRole="alert" style={local.fieldError}>
              {formErrors.materialType}
            </Text>
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
        <PickupDateField model={model} />

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

        <ActionButton
          title={
            listingCreatedNeedsRefresh ? 'İlan oluşturuldu' : 'İlanı oluştur'
          }
          disabled={submitting || listingCreatedNeedsRefresh}
          loading={submitting}
          onPress={() => void submitListing()}
          style={local.submitButton}
          textStyle={local.submitText}
        />
      </View>
    </>
  );
}
