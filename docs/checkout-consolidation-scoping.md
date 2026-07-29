# Checkout consolidation — scoping

## What happens today

A cart with **N items** produces **N Sharetribe transactions and N Stripe charges**, created one at a time in a
sequential loop (`src/containers/CartCheckoutPage/CartCheckoutPage.duck.js:161`). If the order ships and
`REACT_APP_DELIVERY_LISTING_ID` is set, a further transaction + charge is created for delivery, so it's N+1.

| Cart | Sharetribe txns | Stripe charges | Customer emails |
|---|---|---|---|
| N items, pickup | N | N | N |
| N items, shipping | N + 1 | N + 1 | N |

This is per **item**, not per vendor — two items from the same farm are still two transactions and two charges.

So the client's three complaints are all real and all trace to the same root cause:

1. Sharetribe transaction-volume fee, charged N times.
2. Stripe's fixed $0.30 per charge, paid N times.
3. The customer's card is authorized N times and they receive N receipt emails.

The codebase already has a substantial layer built to *paper over* this — `orderGroupId` stamped into every
transaction's `protectedData`, a cart-wide platform fee split proportionally across the N transactions, one
consolidated delivery fee, and a delivery reconciliation service. All of it exists to make N transactions behave
like one order. None of it reduces the transaction or charge count.

## Why "just merge them into one transaction" doesn't work

Two hard constraints in Sharetribe:

- **A transaction has exactly one listing**, therefore one provider and one Stripe destination account. Money from
  a transaction is paid out to that listing's owner (`:action/stripe-create-payout`). You cannot put two farms'
  products in one transaction and have both get paid.
- **Stock is reserved per transaction, on that transaction's listing only**
  (`:action/create-pending-stock-reservation`). If you smuggle other listings in as custom line items, their stock
  is never reserved, released, or decremented — you would be hand-rolling inventory management and risking
  overselling.

## Options

### Option A — One consolidated receipt email (partial fix, small)

Leave the transactions alone; just stop emailing the customer N times. Suppress the per-transaction
`order-receipt` template and send one receipt for the whole `orderGroupId`.

- **Fixes:** the N-emails complaint only. Card is still charged N times; fees unchanged.
- **Catch:** there is no email provider in this repo — all customer email comes from Sharetribe's process
  templates. This means adding SendGrid/Postmark plus templates, which is most of the cost.
- **Estimate:** ~1 week.

### Option B — Consolidate per vendor (N items → 1 transaction per vendor)

Group the cart by farm. Anchor each vendor's transaction on one of their listings and add their other items as
server-computed custom line items.

- **Fixes:** charges drop from #items to #vendors. A 10-item cart from 3 farms → 3 charges instead of 10.
- **Catch:** this is the option that breaks stock. Every non-anchor listing needs manual stock reservation via the
  Integration SDK, and manual reversal on decline/cancel/expire. That is the bulk of the work and the bulk of the
  risk — a bug here means selling inventory that doesn't exist. The order breakdown, vendor transaction page, and
  inbox all need to render multiple items too.
- **Estimate:** 2–3 weeks.

### Option C — Single charge, platform as merchant of record (full fix) — **recommended**

Extend the pattern already in use for delivery. Today there's an operator-owned delivery listing that takes its own
separate charge. Do the same thing for the whole order:

- One transaction against an operator-owned **"Order"** listing carrying the full cart as line items → **one Stripe
  PaymentIntent, one receipt email**, rendered natively from that process's own template (no email provider needed).
- **Per-line-item** fulfillment transactions on a new process with stock actions but **no Stripe actions** — $0,
  purely the accept/decline/fulfil workflow. Because each is still anchored to its real listing, **stock reservation
  keeps working natively**, which is exactly what Option B breaks.
- Vendors are paid from the platform balance via Stripe transfers (*separate charges and transfers*) rather than
  destination charges.

> **Correction (was "per-vendor").** Fulfillment transactions must be **one per line item, not one per vendor**.
> `:action/create-pending-stock-reservation` reserves stock on the transaction's own listing only, so a vendor with
> three items in the cart needs three transactions or two of those listings never get reserved. Consequence:
> Sharetribe transaction count stays at N+1 — only the *Stripe charge* count drops to 1. This makes the volume-fee
> question below decisive rather than incidental. Going per-vendor to claw those back requires hand-reserving stock
> for non-anchor listings, which reintroduces Option B's oversell risk.

**What this fixes:** the customer sees one charge and gets one email. Stripe's $0.30 is paid once instead of N
times (the percentage component scales with value and is unchanged, so the saving tracks item count, not order
size). Partial refunds (one farm declines) get *easier* — one PaymentIntent, partially refunded, instead of
unwinding N charges.

**Hardest part of the build:** ordering across two systems with no shared rollback. Stock must be reserved on all N
fulfillment transactions *before* the PaymentIntent is confirmed, with a clean release of all of them if any
reservation or the payment itself fails — otherwise the buyer is charged for produce that sold out mid-checkout.
This drives the estimate more than the Stripe plumbing does.

**Open question that must be answered before committing:** whether Sharetribe's volume fee is a percentage of
transaction value or a flat per-transaction charge. If it's percentage-of-value, the $0 fulfillment transactions
cost nothing and the Sharetribe bill drops too. If it's flat per transaction, this option fixes Stripe fees and the
customer experience but **not** the Sharetribe fee. Worth confirming with Sharetribe directly.

**Business decision, not just engineering:** taking the money onto the platform's own account makes FarmFed the
merchant of record. That means chargeback liability, refund handling, and likely 1099-K reporting obligations for
vendors. This needs a yes from the business before any code is written.

- **Estimate:** 4–6 weeks engineering, after the merchant-of-record question is settled.

## Recommendation

Option C is the only one that actually delivers what was asked for ("one transaction"), and it sidesteps the
inventory risk that makes Option B unattractive. But it isn't a purely technical call — it changes who holds the
money. Suggested sequence:

1. Confirm with Sharetribe how the volume fee is calculated. (Cheap, and it changes the ROI.)
2. Get a business decision on merchant-of-record.
3. Then build Option C.

If a faster visible win is needed while that's being decided, Option A (one receipt email) is independent of the
others and won't be thrown away by Option C.
