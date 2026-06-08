const { getSdk, handleError } = require('../api-util/sdk');
const { getPickupSettings } = require('../api-util/pickupSchedule');

const handler = async (req, res) => {
  const sdk = getSdk(req, res);

  try {
    const settings = getPickupSettings();
    const dayMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

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
        'transition/accept-order',
      ],
      page: 1,
      perPage: 20,
    });

    const transactions = response.data.data;

    // Find the most recent transaction with an orderGroupId
    const withGroup = transactions.find(tx => {
      const protectedData = tx.attributes.protectedData || {};
      return !!protectedData.orderGroupId;
    });

    if (withGroup) {
      const orderGroupId = withGroup.attributes.protectedData.orderGroupId;
      // Find the standalone delivery transaction for this group (if any) so new
      // items can be attached to the SAME delivery rather than re-charging it.
      const deliveryTx = transactions.find(tx => {
        const pd = tx.attributes.protectedData || {};
        return pd.isDeliveryOrder === true && pd.orderGroupId === orderGroupId;
      });
      const deliveryTransactionId = deliveryTx?.id?.uuid || null;
      return res.status(200).json({ orderGroupId, deliveryTransactionId, canAddToOrder: true });
    }

    res.status(200).json({ orderGroupId: null, deliveryTransactionId: null, canAddToOrder: false });
  } catch (e) {
    handleError(res, e);
  }
};

module.exports = handler;
