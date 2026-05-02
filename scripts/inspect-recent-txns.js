/* eslint-disable no-console */
require('dotenv').config();
const integrationSdkPkg = require('sharetribe-flex-integration-sdk');

const integrationSdk = integrationSdkPkg.createInstance({
  clientId: process.env.SHARETRIBE_INTEGRATION_API_CLIENT_ID,
  clientSecret: process.env.SHARETRIBE_INTEGRATION_API_CLIENT_SECRET,
});

(async () => {
  const resp = await integrationSdk.transactions.query({
    perPage: 50,
    sort: '-createdAt',
  });
  console.log(`Found ${resp.data.data.length} recent transactions\n`);
  const versions = {};
  const states = {};
  resp.data.data.forEach(t => {
    const a = t.attributes;
    const key = `${a.processName}@${a.processVersion}`;
    versions[key] = (versions[key] || 0) + 1;
    states[a.state] = (states[a.state] || 0) + 1;
    console.log(`${a.createdAt}  state=${a.state}  process=${key}  lastTransition=${a.lastTransition}`);
  });
  console.log('\n--- Process version breakdown ---');
  Object.entries(versions).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log('\n--- State breakdown ---');
  Object.entries(states).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  console.log('\n--- Transitions on most recent txn ---');
  const first = resp.data.data[0];
  if (first) {
    (first.attributes.transitions || []).forEach(tr => {
      console.log(`  ${tr.createdAt}  ${tr.transition}  by=${tr.by}`);
    });
  }
})().catch(e => {
  console.error('FATAL', e.message, e.data?.errors || '');
  process.exit(1);
});
