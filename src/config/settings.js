import { subUnitDivisors, currencyFormatting, stripeSupportedCurrencies } from './settingsCurrency';

// NOTE: only expose configuration that should be visible in the
// client side, don't add any server secrets in this file.
//
// To pass environment variables to the client app in the build
// script, react-scripts (and the sharetribe-scripts fork of
// react-scripts) require using the REACT_APP_ prefix to avoid
// exposing server secrets to the client side.

const appSettings = {
  env: process.env.REACT_APP_ENV,
  dev: process.env.REACT_APP_ENV === 'development',
  verbose: false,

  // Feature flags — toggle marketplace features on/off
  featureFlags: {
    pickupSchedule: true,        // #1 - Saturday-only pickup + admin day config
    dualServiceRadius: true,     // #2 - Separate vendor/consumer geofences
    vendorPickupSchedules: true, // #3 - Vendor pickup day/time windows
    soldOutVisibility: false,     // #4 - "Back Next Week" vs hide
    orderMaxPerDay: false,        // #5 - Vendor daily order cap
    addToExistingOrder: true,    // #6 - Amend orders before cutoff
    vendorFollow: true,          // #7 - Follow vendors + notifications
    taxBreakdown: true,          // #8 - Sales tax line items
    inboxRedesign: true,         // #9 - New/Completed/Messages tabs
    deliveryProblemReport: true, // #10 - Problem reporting for deliveries
    vendorBulletin: false,        // #11 - Promotional vendor bulletin board
  },

  sdk: {
    clientId: process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID,
    baseUrl: process.env.REACT_APP_SHARETRIBE_SDK_BASE_URL,
    assetCdnBaseUrl: process.env.REACT_APP_SHARETRIBE_SDK_ASSET_CDN_BASE_URL,
    transitVerbose: process.env.REACT_APP_SHARETRIBE_SDK_TRANSIT_VERBOSE === 'true',
  },

  // Get currency formatting options for given currency.
  // See: https://github.com/yahoo/react-intl/wiki/API#formatnumber
  getCurrencyFormatting: currencyFormatting,
  // It's not guaranteed that currencies can be split to 100 subunits!
  subUnitDivisors,

  stripeSupportedCurrencies,

  // Sentry DSN (Data Source Name), a client key for authenticating calls to Sentry
  sentryDsn: process.env.REACT_APP_SENTRY_DSN,

  // If webapp is using SSL (i.e. it's behind 'https' protocol)
  usingSSL: process.env.REACT_APP_SHARETRIBE_USING_SSL === 'true',
};

export default appSettings;
