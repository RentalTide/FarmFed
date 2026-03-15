const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.resolve(__dirname, '../data/pickup-settings.json');

const DEFAULT_SETTINGS = {
  pickupDays: ['saturday'],
  cutoffDay: 'thursday',
  cutoffTime: '18:00',
};

const getPickupSettings = () => {
  try {
    const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    return {
      pickupDays: Array.isArray(data.pickupDays) ? data.pickupDays : DEFAULT_SETTINGS.pickupDays,
      cutoffDay: data.cutoffDay || DEFAULT_SETTINGS.cutoffDay,
      cutoffTime: data.cutoffTime || DEFAULT_SETTINGS.cutoffTime,
    };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
};

const setPickupSettings = settings => {
  const data = {
    pickupDays: settings.pickupDays,
    cutoffDay: settings.cutoffDay,
    cutoffTime: settings.cutoffTime,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf8');
};

// Calculate the next available pickup date based on current settings
const getNextPickupDate = () => {
  const settings = getPickupSettings();
  const dayMap = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const now = new Date();
  const cutoffDayNum = dayMap[settings.cutoffDay];
  const cutoffHour = parseInt(settings.cutoffTime.split(':')[0], 10);
  const cutoffMinute = parseInt(settings.cutoffTime.split(':')[1], 10);

  // Check if we're past the cutoff for this week
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const isPastCutoff =
    currentDay > cutoffDayNum ||
    (currentDay === cutoffDayNum &&
      (currentHour > cutoffHour || (currentHour === cutoffHour && currentMinute >= cutoffMinute)));

  // Find the next pickup day
  const pickupDayNums = settings.pickupDays.map(d => dayMap[d]).sort((a, b) => a - b);
  if (pickupDayNums.length === 0) return null;

  let daysToAdd = null;
  for (const pickupDay of pickupDayNums) {
    const diff = (pickupDay - currentDay + 7) % 7;
    const candidateDays = diff === 0 ? 7 : diff; // If today is pickup day, next week

    if (!isPastCutoff && candidateDays <= 7) {
      daysToAdd = candidateDays;
      break;
    } else if (isPastCutoff) {
      // If past cutoff, we need at least next week's pickup day
      const nextWeekDiff = diff === 0 ? 7 : diff;
      if (nextWeekDiff > (cutoffDayNum - currentDay + 7) % 7) {
        daysToAdd = nextWeekDiff;
        break;
      }
    }
  }

  if (daysToAdd === null) {
    daysToAdd = (pickupDayNums[0] - currentDay + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7;
    if (isPastCutoff) daysToAdd += 7;
  }

  const nextPickup = new Date(now);
  nextPickup.setDate(nextPickup.getDate() + daysToAdd);
  nextPickup.setHours(0, 0, 0, 0);
  return nextPickup.toISOString();
};

const isCutoffPassed = () => {
  const settings = getPickupSettings();
  const dayMap = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
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
