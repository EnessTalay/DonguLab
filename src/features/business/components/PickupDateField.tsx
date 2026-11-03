import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { InputField } from '@/components/input-field';
import {
  dateFromIstanbulDate,
  istanbulDate as getTodayInIstanbul,
} from '@/lib/dates';
import { local } from '../styles';
import type { BusinessModel } from '../use-business';

export function PickupDateField({
  model,
}: {
  model: Pick<
    BusinessModel,
    | 'form'
    | 'formErrors'
    | 'submitting'
    | 'updateForm'
    | 'openPickupDatePicker'
    | 'iosDatePickerVisible'
    | 'iosSelectedDate'
    | 'setIosSelectedDate'
    | 'cancelIosDatePicker'
    | 'confirmIosDatePicker'
  >;
}) {
  const {
    form,
    formErrors,
    submitting,
    updateForm,
    openPickupDatePicker,
    iosDatePickerVisible,
    iosSelectedDate,
    setIosSelectedDate,
    cancelIosDatePicker,
    confirmIosDatePicker,
  } = model;
  return Platform.OS === 'web' ? (
    <InputField
      label="Son teslim alma tarihi"
      value={form.pickupDeadline}
      onChangeText={updateForm('pickupDeadline')}
      placeholder="YYYY-AA-GG"
      maxLength={10}
      editable={!submitting}
      error={formErrors.pickupDeadline}
    />
  ) : (
    <View style={local.field}>
      <Text style={local.label}>Son teslim alma tarihi</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: submitting }}
        accessibilityLabel="Son teslim alma tarihi seç"
        accessibilityHint="Takvimi açar; bugün veya ileri bir tarih seçebilirsiniz."
        disabled={submitting}
        onPress={openPickupDatePicker}
        style={local.input}
      >
        <Text
          style={form.pickupDeadline ? local.dateValue : local.datePlaceholder}
        >
          {form.pickupDeadline || 'Takvimden tarih seçin'}
        </Text>
      </Pressable>
      {formErrors.pickupDeadline && (
        <Text accessibilityRole="alert" style={local.fieldError}>
          {formErrors.pickupDeadline}
        </Text>
      )}
      {Platform.OS === 'ios' && iosDatePickerVisible && iosSelectedDate && (
        <View style={local.iosDatePicker}>
          <DateTimePicker
            accessibilityLabel="Son teslim alma takvimi"
            display="spinner"
            locale="tr-TR"
            minimumDate={dateFromIstanbulDate(getTodayInIstanbul())}
            mode="date"
            onValueChange={(_event, selectedDate) =>
              setIosSelectedDate(selectedDate)
            }
            timeZoneName="Europe/Istanbul"
            value={iosSelectedDate}
          />
          <View style={local.datePickerActions}>
            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={cancelIosDatePicker}
              style={local.datePickerAction}
            >
              <Text style={local.retryText}>İptal</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={confirmIosDatePicker}
              style={local.datePickerAction}
            >
              <Text style={local.retryText}>Seç</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
