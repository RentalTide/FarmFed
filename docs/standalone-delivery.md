# Standalone delivery orders

Delivery is decoupled from individual cart-item transactions. Instead of riding
on the first shipping item (where a single vendor's decline would refund it),
the whole route delivery fee is charged once on its own **delivery transaction**
(`default-delivery` process). That delivery is **only refunded ("kicked back")
when the entire order is denied** — i.e. every item transaction in the order
group ends up declined / auto-declined / payment-expired. If at least one item
is accepted, the delivery payment is captured.

## How it works

1. At cart checkout (`CartCheckoutPage.duck.js`), the item transactions are
   created first (each with `customShippingFeeCents: 0`).
2. A single **delivery transaction** is then created against the operator-owned
   delivery listing, carrying `line-item/delivery` = the full route fee.
3. The successful item transaction ids are linked onto the delivery transaction
   (`metadata.itemTransactionIds`) via `POST /api/link-delivery-items`.
4. **Reconciliation** (`server/api-util/deliveryReconcile.js`) decides the
   delivery's fate:
   - every item denied → `transition/operator-refund` (full refund),
   - any item accepted (none pending) → `transition/operator-capture`.
   It runs from two places:
   - **Fast path:** when a vendor manually declines, `push-transition.js` calls
     reconcile for open deliveries.
   - **Robust backstop:** `scripts/reconcile-deliveries.js` (or
     `POST /api/reconcile-delivery` with no body) on a schedule — this catches
     the 24h auto-declines that never ping the server.

## One-time setup (Sharetribe Console / CLI)

1. **Deploy the process.** Push the new process to your marketplace:
   ```
   flex-cli process push \
     --path ext/transaction-processes/default-delivery \
     --process default-delivery \
     -m <your-marketplace-id>
   flex-cli process create-alias \
     --process default-delivery --version 1 --alias release-1 \
     -m <your-marketplace-id>
   ```
   (Use `flex-cli process update-alias` for subsequent versions.)

2. **Create the delivery listing.** As the operator/hub account, publish one
   listing (e.g. "FarmFed Delivery") with:
   - `publicData.transactionProcessAlias = "default-delivery/release-1"`
   - `publicData.unitType = "delivery"`   ← required; drives the line-item logic
   - a price (any value/currency, e.g. $0.00 USD — the actual fee is set per
     order from the route calculation).
   The listing's author (the hub account) must have **Stripe Connect onboarded**,
   like any provider, so payment intents and payouts work.

   **Keeping it out of public search:** the delivery listing stays `published`
   (so checkout can transact against it) but must not appear in browse/search.
   This is handled by `enforceValidListingType = true` in `configListing.js` —
   search only returns listings whose `pub_listingType` is a configured type, so
   `listingType: 'delivery'` is excluded. This takes effect on **deploy**. To
   hide it on an already-deployed site before that deploy, close the listing
   (operator/Console or `sdk.listings.close`), then **re-open it at deploy**
   (closed listings can't transact):
   ```
   node scripts/create-delivery-listing.js --open   # uses REACT_APP_DELIVERY_LISTING_ID
   ```

3. **Set the env var** so checkout knows which listing to use:
   ```
   REACT_APP_DELIVERY_LISTING_ID=<the-delivery-listing-uuid>
   ```
   If unset, checkout safely falls back to the legacy first-item shipping fee.

4. **Integration API** must be enabled (you already use it for the OnFleet
   webhook). `INTEGRATION_CLIENT_ID` / `INTEGRATION_CLIENT_SECRET` must be set.

5. **Schedule reconciliation** (every ~15 min), e.g.:
   ```
   */15 * * * *  cd /app && node scripts/reconcile-deliveries.js
   ```
   or point an uptime pinger / host scheduler at `POST /api/reconcile-delivery`.

## Add to an existing order (until cutoff)

With the `addToExistingOrder` feature flag enabled, checkout offers "add to your
existing order" when the buyer has an open order group and the pickup **cutoff**
(`pickupSchedule.js`, default Thu 18:00) has not passed. `GET
/api/active-order-group` enforces the cutoff and returns both the `orderGroupId`
and that group's `deliveryTransactionId`. When the buyer adds on:

- the new item transactions join the same `orderGroupId`,
- they carry **$0 shipping** (no new delivery fee), and
- they are linked onto the **existing** delivery transaction
  (`link-delivery-items`), so reconciliation considers the whole group together.

After the cutoff, `canAddToOrder` is `false`, the option disappears, and the
next checkout starts a **new** order group with its own standalone delivery.

## Tuning

- Payout/capture timing lives in `default-delivery/process.edn` (`auto-capture`
  at P3D, `auto-payout` at P7D). Adjust to your settlement preference and
  redeploy.
- The delivery line item has no commission or tax — it is the hub's own revenue.
