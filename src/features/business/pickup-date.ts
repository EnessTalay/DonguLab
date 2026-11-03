import { validDate, istanbulDate, dateFromIstanbulDate } from '../../lib/dates';

export function isValidPickupDeadline(value: string) {
  return validDate(value) && value >= istanbulDate();
}

export function getPickerValue(value: string) {
  return dateFromIstanbulDate(
    isValidPickupDeadline(value) ? value : istanbulDate(),
  );
}
