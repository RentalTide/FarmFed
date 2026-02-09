const { getSdk, getIntegrationSdk, handleError } = require('../../api-util/sdk');

module.exports = (req, res) => {
  const sdk = getSdk(req, res);

  sdk.currentUser
    .show({ include: [] })
    .then(response => {
      const currentUser = response.data.data;
      const isAdmin = currentUser?.attributes?.profile?.privateData?.isAdmin === true;

      if (!isAdmin) {
        return res.status(403).json({ error: 'Forbidden: admin access required' });
      }

      const integrationSdk = getIntegrationSdk();

      return integrationSdk.users
        .query({
          states: ['pending-approval'],
          include: [],
        })
        .then(usersResponse => {
          const users = usersResponse.data.data || [];

          const pendingUsers = users.map(user => {
            const { profile, createdAt, email } = user.attributes;
            const protectedData = profile?.protectedData || {};
            const publicData = profile?.publicData || {};

            return {
              id: user.id.uuid,
              firstName: profile?.firstName || '',
              lastName: profile?.lastName || '',
              email: email || '',
              createdAt,
              address: protectedData.address || null,
              outsideDeliveryZone: publicData.outsideDeliveryZone || false,
            };
          });

          res.status(200).json({ users: pendingUsers });
        });
    })
    .catch(e => {
      handleError(res, e);
    });
};
