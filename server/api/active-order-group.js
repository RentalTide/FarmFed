const { getSdk, handleError } = require('../api-util/sdk');
const { getPickupSettings } = require('../api-util/pickupSchedule');

const handler = async (req, res) => {
  const sdk = getSdk(req, res);

  try {
    const settings = getPickupSettings();
    const dayMap = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };

    const now = new Date();
    const cutoffDayNum = dayMap[settings.cutoffDay];
    const [cutoffHour, cutoffMinute] = settings.cutoffTime.split(':').map(Number);

    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isPastCutoff =
      currentDay > cutoffDayNum ||
      (currentDay === cutoffDayNum &&
        (currentHour > cutoffHour ||
          (currentHour === cutoffHour && currentMinute >= cutoffMinute)));

    if (isPastCutoff) {
      return res.status(200).json({ orderGroupId: null, canAddToOrder: false });
    }

    // Query recent transactions for this customer
    const response = await sdk.transactions.query({
      only: 'order',
      lastTransitions: [
        'transition/confirm-payment',
        'transition/accept',
      ],
      page: 1,
      perPage: 10,
    });

    const transactions = response.data.data;

    // Find the most recent transaction with an orderGroupId
    const withGroup = transactions.find(tx => {
      const protectedData = tx.attributes.protectedData || {};
      return !!protectedData.orderGroupId;
    });

    if (withGroup) {
      const orderGroupId = withGroup.attributes.protectedData.orderGroupId;
      return res.status(200).json({ orderGroupId, canAddToOrder: true });
    }

    res.status(200).json({ orderGroupId: null, canAddToOrder: false });
  } catch (e) {
    handleError(res, e);
  }
};

module.exports = handler;
