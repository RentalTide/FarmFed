const { getSdk, getIntegrationSdk, handleError } = require('../../api-util/sdk');

// Admin-only: list all provider/vendor users with their tax-exempt flag.
module.exports = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show({ include: [] });
    const isAdmin = currentUserResponse.data.data?.attributes?.profile?.privateData?.isAdmin === true;
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden: admin access required' });
    }

    const integrationSdk = getIntegrationSdk();
    const perPage = 100;
    let page = 1;
    const vendors = [];

    while (true) {
      const resp = await integrationSdk.users.query({
        pub_userType: 'provider',
        perPage,
        page,
      });
      const batch = resp.data.data || [];
      for (const user of batch) {
        const profile = user.attributes?.profile || {};
        vendors.push({
          id: user.id?.uuid || user.id,
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          displayName: profile.displayName || '',
          email: user.attributes?.email || '',
          taxExempt: profile.privateData?.taxExempt === true,
        });
      }
      const totalPages = resp.data.meta?.totalPages || 1;
      if (page >= totalPages || batch.length === 0) break;
      page += 1;
    }

    res.status(200).json({ vendors });
  } catch (e) {
    handleError(res, e);
  }
};
