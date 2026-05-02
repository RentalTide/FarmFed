/* eslint-disable no-console */
require('dotenv').config();
const sdkPkg = require('sharetribe-flex-sdk');

// Use marketplace SDK (not integration) — only it can read hosted assets
const sdk = sdkPkg.createInstance({
  clientId: process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID,
});

(async () => {
  try {
    const resp = await sdk.assetByAlias({
      path: 'listings/listing-types.json',
      alias: 'latest',
    });
    console.log('=== HOSTED listing-types.json (raw) ===');
    console.log(JSON.stringify(resp.data, null, 2));
  } catch (e) {
    console.log('listing-types asset error:', e.message);
  }
})().catch(e => {
  console.error('FATAL', e.message);
  process.exit(1);
});
