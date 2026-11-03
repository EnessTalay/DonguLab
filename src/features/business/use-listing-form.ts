import { useState } from 'react';
import { Platform } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { services } from '@/services';
import type { MaterialType } from '@/types/domain';
import type { BusinessResources } from './use-business-resources';
import {
  emptyForm,
  parseListingForm,
  type ListingFormErrors,
} from './listing-form';
import { parsePositiveNumber } from '@/lib/numbers';
import {
  dateFromIstanbulDate,
  istanbulDate as formatIstanbulDate,
  istanbulDate as getTodayInIstanbul,
} from '@/lib/dates';
import { isValidPickupDeadline, getPickerValue } from './pickup-date';
import { getErrorMessage } from './errors';

export function useListingForm({ loadListings }: BusinessResources) {
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<ListingFormErrors>({});
  const [materialType, setMaterialType] = useState<MaterialType>('wood');
  const [iosDatePickerVisible, setIosDatePickerVisible] = useState(false);
  const [iosSelectedDate, setIosSelectedDate] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [listingCreatedNeedsRefresh, setListingCreatedNeedsRefresh] =
    useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success' | 'warning';
    message: string;
  } | null>(null);
  async function refreshListings() {
    const refreshed = await loadListings();
    if (refreshed && listingCreatedNeedsRefresh) {
      setForm(emptyForm);
      setFormErrors({});
      setMaterialType('wood');
      setListingCreatedNeedsRefresh(false);
      setFeedback({
        type: 'success',
        message: 'İlanınız oluşturuldu ve ilan listeniz yenilendi.',
      });
    }
  }

  const updateForm = (field: keyof typeof emptyForm) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => {
      if (!current[field] || !isFormFieldValid(field, value)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  function isFormFieldValid(field: keyof typeof emptyForm, value: string) {
    if (field === 'title')
      return Boolean(value.trim()) && value.trim().length <= 200;
    if (field === 'region')
      return Boolean(value.trim()) && value.trim().length <= 120;
    if (field === 'widthMm' || field === 'heightMm')
      return parsePositiveNumber(value) !== null;
    if (field === 'thicknessMm')
      return !value.trim() || parsePositiveNumber(value) !== null;
    if (field === 'quantityOnHand') {
      const quantity = Number(value.trim());
      return (
        Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 2147483647
      );
    }

    return isValidPickupDeadline(value);
  }

  function applyPickupDate(date: Date) {
    const pickupDeadline = formatIstanbulDate(date);
    if (!isValidPickupDeadline(pickupDeadline)) {
      setFormErrors((current) => ({
        ...current,
        pickupDeadline: 'Bugün veya daha ileri bir tarih seçin.',
      }));
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

  async function submitListing() {
    if (submitting || listingCreatedNeedsRefresh) return;
    setFeedback(null);
    const validation = parseListingForm(form, materialType);
    setFormErrors(validation.errors);
    if (!validation.input) {
      return;
    }

    setSubmitting(true);
    try {
      await services.createListing(validation.input);
      setListingCreatedNeedsRefresh(true);
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
          message:
            'İlan oluşturuldu ancak İlanlarım yenilenemedi. İlan yeniden oluşturulmayacak; listeyi yenilemek için aşağıdaki düğmeyi kullanın.',
        });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  return {
    form,
    formErrors,
    setFormErrors,
    materialType,
    setMaterialType,
    iosDatePickerVisible,
    iosSelectedDate,
    setIosSelectedDate,
    submitting,
    listingCreatedNeedsRefresh,
    feedback,
    refreshListings,
    updateForm,
    openPickupDatePicker,
    cancelIosDatePicker,
    confirmIosDatePicker,
    submitListing,
  };
}
