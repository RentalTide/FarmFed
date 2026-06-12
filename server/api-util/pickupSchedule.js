const settingsStore = require('./settingsStore');

const NAMESPACE = 'pickup-settings';

// All cutoff/delivery-day math must use the marketplace's wall-clock time, not
// the server's. Deployed servers typically run in UTC, so e.g. a "Thursday
// 18:00" cutoff would otherwise trip at 2pm Eastern and delivery dates would
// shift by a day when rendered in local time.
const DEFAULT_TIMEZONE = process.env.PICKUP_TIMEZONE || 'America/Toronto';

const DEFAULT_SETTINGS = {
  pickupDays: ['sat'],
  cutoffDay: 'thu',
  cutoffTime: '18:00',
  timezone: DEFAULT_TIMEZONE,
};

const LEGACY_DAY_MAP = {
  sunday: 'sun', monday: 'mon', tuesday: 'tue', wednesday: 'wed',
  thursday: 'thu', friday: 'fri', saturday: 'sat',
};
const normalizeDay = d => LEGACY_DAY_MAP[d] || d;

const DAY_NUMS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

const isValidTimezone = tz => {
  // Intl silently falls back to the system timezone for a missing timeZone
  // option, so reject non-strings explicitly.
  if (typeof tz !== 'string' || tz.length === 0) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
};

// Wall-clock day-of-week, time, and calendar date of `date` in `timeZone`.
const getZonedParts = (date, timeZone) => {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = type => formatted.find(p => p.type === type)?.value;
  const weekdayNums = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    dayNum: weekdayNums[get('weekday')],
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
  };
};

// Has the cutoff for the current week (sun–sat) passed, given "now" expressed
// as zoned parts?
const isPastCutoff = (nowParts, cutoffDayNum, cutoffTime) => {
  const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(s => parseInt(s, 10));
  return (
    nowParts.dayNum > cutoffDayNum ||
    (nowParts.dayNum === cutoffDayNum &&
      (nowParts.hour > cutoffHour ||
        (nowParts.hour === cutoffHour && nowParts.minute >= cutoffMinute)))
  );
};

const getPickupSettings = () => {
  const data = settingsStore.get(NAMESPACE) || {};
  const rawDays = Array.isArray(data.pickupDays) ? data.pickupDays : DEFAULT_SETTINGS.pickupDays;
  const timezone = isValidTimezone(data.timezone) ? data.timezone : DEFAULT_SETTINGS.timezone;
  return {
    pickupDays: rawDays.map(normalizeDay),
    cutoffDay: normalizeDay(data.cutoffDay || DEFAULT_SETTINGS.cutoffDay),
    cutoffTime: data.cutoffTime || DEFAULT_SETTINGS.cutoffTime,
    timezone,
  };
};

const setPickupSettings = async settings => {
  const data = {
    pickupDays: settings.pickupDays,
    cutoffDay: settings.cutoffDay,
    cutoffTime: settings.cutoffTime,
    timezone: settings.timezone,
    updatedAt: new Date().toISOString(),
  };
  await settingsStore.set(NAMESPACE, data);
};

// Calculate the next available delivery date based on current settings.
// Rule: orders placed before the next upcoming cutoff are delivered on the
// FIRST scheduled delivery day that falls AFTER that cutoff. Orders placed
// after a cutoff have to wait for the cutoff after that.
// Returns a date-only string (YYYY-MM-DD) in the marketplace timezone, so
// clients must format it without converting through UTC midnight.
const getNextPickupDate = () => {
  const settings = getPickupSettings();

  const pickupDayNums = settings.pickupDays.map(d => DAY_NUMS[d]).filter(n => n !== undefined);
  if (pickupDayNums.length === 0) return null;
  const pickupDaySet = new Set(pickupDayNums);

  const cutoffDayNum = DAY_NUMS[settings.cutoffDay];
  const nowParts = getZonedParts(new Date(), settings.timezone);

  // Days from today (marketplace time) to the next upcoming cutoff.
  let offsetToCutoff = (cutoffDayNum - nowParts.dayNum + 7) % 7;
  if (offsetToCutoff === 0 && isPastCutoff(nowParts, cutoffDayNum, settings.cutoffTime)) {
    // Today is cutoff day but we're past the time → next week's same cutoff.
    offsetToCutoff = 7;
  }

  // First delivery day strictly AFTER the next cutoff. Pure calendar
  // arithmetic on the zoned date — weekday of a calendar date doesn't depend
  // on timezone or DST.
  for (let offset = offsetToCutoff + 1; offset <= offsetToCutoff + 14; offset++) {
    const candidate = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day + offset));
    if (pickupDaySet.has(candidate.getUTCDay())) {
      return candidate.toISOString().slice(0, 10);
    }
  }
  return null;
};

const isCutoffPassed = () => {
  const settings = getPickupSettings();
  const nowParts = getZonedParts(new Date(), settings.timezone);
  return isPastCutoff(nowParts, DAY_NUMS[settings.cutoffDay], settings.cutoffTime);
};

module.exports = {
  getPickupSettings,
  setPickupSettings,
  getNextPickupDate,
  isCutoffPassed,
  isValidTimezone,
};
