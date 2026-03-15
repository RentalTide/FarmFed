const { getSdk, getIntegrationSdk, handleError } = require('../api-util/sdk');

const followHandler = async (req, res) => {
  const sdk = getSdk(req, res);

  try {
    const response = await sdk.currentUser.show({ include: [] });
    const currentUser = response.data.data;
    const userId = currentUser.id.uuid;
    const privateData = currentUser?.attributes?.profile?.privateData || {};
    const followedVendors = Array.isArray(privateData.followedVendors)
      ? privateData.followedVendors
      : [];

    const { vendorId } = req.body || {};
    if (!vendorId) {
      return res.status(400).json({ error: 'vendorId is required' });
    }

    if (followedVendors.includes(vendorId)) {
      return res.status(200).json({ followedVendors });
    }

    const updatedVendors = [...followedVendors, vendorId];

    await sdk.currentUser.updateProfile({
      privateData: { followedVendors: updatedVendors },
    });

    res.status(200).json({ followedVendors: updatedVendors });
  } catch (e) {
    handleError(res, e);
  }
};

const unfollowHandler = async (req, res) => {
  const sdk = getSdk(req, res);

  try {
    const response = await sdk.currentUser.show({ include: [] });
    const currentUser = response.data.data;
    const privateData = currentUser?.attributes?.profile?.privateData || {};
    const followedVendors = Array.isArray(privateData.followedVendors)
      ? privateData.followedVendors
      : [];

    const { vendorId } = req.body || {};
    if (!vendorId) {
      return res.status(400).json({ error: 'vendorId is required' });
    }

    const updatedVendors = followedVendors.filter(id => id !== vendorId);

    await sdk.currentUser.updateProfile({
      privateData: { followedVendors: updatedVendors },
    });

    res.status(200).json({ followedVendors: updatedVendors });
  } catch (e) {
    handleError(res, e);
  }
};

const getFollowedHandler = async (req, res) => {
  const sdk = getSdk(req, res);

  try {
    const response = await sdk.currentUser.show({ include: [] });
    const currentUser = response.data.data;
    const privateData = currentUser?.attributes?.profile?.privateData || {};
    const followedVendors = Array.isArray(privateData.followedVendors)
      ? privateData.followedVendors
      : [];

    res.status(200).json({ followedVendors });
  } catch (e) {
    handleError(res, e);
  }
};

module.exports = { followHandler, unfollowHandler, getFollowedHandler };
