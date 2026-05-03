const settingsStore = require('./settingsStore');

const NAMESPACE = 'pickup-settings';

const DEFAULT_SETTINGS = {
  pickupDays: ['sat'],
  cutoffDay: 'thu',
  cutoffTime: '18:00',
};

const LEGACY_DAY_MAP = {
  sunday: 'sun', monday: 'mon', tuesday: 'tue', wednesday: 'wed',
  thursday: 'thu', friday: 'fri', saturday: 'sat',
};
const normalizeDay = d => LEGACY_DAY_MAP[d] || d;

const getPickupSettings = () => {
  const data = settingsStore.get(NAMESPACE) || {};
  const rawDays = Array.isArray(data.pickupDays) ? data.pickupDays : DEFAULT_SETTINGS.pickupDays;
  return {
    pickupDays: rawDays.map(normalizeDay),
    cutoffDay: normalizeDay(data.cutoffDay || DEFAULT_SETTINGS.cutoffDay),
    cutoffTime: data.cutoffTime || DEFAULT_SETTINGS.cutoffTime,
  };
};

const setPickupSettings = async settings => {
  const data = {
    pickupDays: settings.pickupDays,
    cutoffDay: settings.cutoffDay,
    cutoffTime: settings.cutoffTime,
    updatedAt: new Date().toISOString(),
  };
  await settingsStore.set(NAMESPACE, data);
};

// Calculate the next available delivery date based on current settings.
// Rule: orders placed before the next upcoming cutoff are delivered on the
// FIRST scheduled delivery day that falls AFTER that cutoff. Orders placed
// after a cutoff have to wait for the cutoff after that.
const getNextPickupDate = () => {
  const settings = getPickupSettings();
  const dayMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

  const pickupDayNums = settings.pickupDays.map(d => dayMap[d]).filter(n => n !== undefined);
  if (pickupDayNums.length === 0) return null;
  const pickupDaySet = new Set(pickupDayNums);

  const cutoffDayNum = dayMap[settings.cutoffDay];
  const [cutoffHour, cutoffMinute] = settings.cutoffTime.split(':').map(s => parseInt(s, 10));

  const now = new Date();

  // Find the next upcoming cutoff datetime (not strictly in the past).
  const offsetToCutoffDay = (cutoffDayNum - now.getDay() + 7) % 7;
  const nextCutoff = new Date(now);
  nextCutoff.setDate(now.getDate() + offsetToCutoffDay);
  nextCutoff.setHours(cutoffHour, cutoffMinute, 0, 0);
  if (nextCutoff <= now) {
    // Today is cutoff day but we're past the time → next week's same cutoff.
    nextCutoff.setDate(nextCutoff.getDate() + 7);
  }

  // First delivery day strictly AFTER the next cutoff.
  for (let offset = 1; offset <= 14; offset++) {
    const candidate = new Date(nextCutoff);
    candidate.setDate(nextCutoff.getDate() + offset);
    candidate.setHours(0, 0, 0, 0);
    if (pickupDaySet.has(candidate.getDay())) {
      return candidate.toISOString();
    }
  }
  return null;
};

const isCutoffPassed = () => {
  const settings = getPickupSettings();
  const dayMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const now = new Date();
  const cutoffDayNum = dayMap[settings.cutoffDay];
  const cutoffHour = parseInt(settings.cutoffTime.split(':')[0], 10);
  const cutoffMinute = parseInt(settings.cutoffTime.split(':')[1], 10);
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  return (
    currentDay > cutoffDayNum ||
    (currentDay === cutoffDayNum &&
      (currentHour > cutoffHour || (currentHour === cutoffHour && currentMinute >= cutoffMinute)))
  );
};

module.exports = { getPickupSettings, setPickupSettings, getNextPickupDate, isCutoffPassed };
