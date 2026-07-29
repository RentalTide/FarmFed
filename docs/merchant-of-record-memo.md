# Checkout consolidation — merchant-of-record decision memo

**Prepared for:** FarmFed business owners
**Decision required:** Does FarmFed become the merchant of record for marketplace orders?
**Prepared by:** Engineering
**Status:** Awaiting business decision — no code will be written until this is answered

---

## 1. The problem, in one paragraph

A buyer with five items in their cart today gets their card charged five separate times, receives five
receipt emails, and FarmFed pays Stripe's fixed per-charge fee five times. If the order ships, it's six. This
is not a bug or a display issue — it's structural. Every cart item becomes its own independent transaction,
created one at a time
(`src/containers/CartCheckoutPage/CartCheckoutPage.duck.js:178`). Two items from the *same* farm are still
two charges.

The ask is simple: one order, one charge, one receipt. Delivering it requires a change to who holds the money,
which is why this memo exists.

---

## 2. Why the current platform can't just merge them

FarmFed runs on Sharetribe. Sharetribe has two hard constraints that make "put the whole cart in one
transaction" impossible:

- **One transaction has exactly one listing, therefore one seller.** Payout goes to that listing's owner. You
  cannot put two farms' products in a single transaction and have both farms get paid.
- **Inventory is reserved per transaction, on that transaction's listing only.** If you smuggle other farms'
  products in as extra line items, their stock is never reserved or decremented — you would be hand-building
  inventory management and risking selling produce you don't have.

Underneath, this traces to how Stripe is wired. Sharetribe uses Stripe's *destination charge* model, where each
charge is aimed at exactly one connected seller account. One charge, one seller. Multiple sellers therefore
means multiple charges, by construction.

**Considerable engineering already exists to paper over this** — a shared order ID stamped across the
transactions, a cart-wide platform fee split proportionally, one consolidated delivery fee, a reconciliation
service. All of it makes N transactions *behave* like one order for reporting purposes. None of it reduces the
number of times the buyer's card is charged.

---

## 3. What actually fixes it

Stripe supports a second model that Sharetribe does not wire up for you: **separate charges and transfers**.
One payment lands on the platform's own Stripe account, and the platform then sends money out to each seller
as a separate transfer. This is how multi-vendor grocery and delivery marketplaces handle mixed carts.

Adopting it means separating the *money* from the *fulfilment*:

**The money leg — one transaction, one charge.**
A single transaction against a FarmFed-owned "Order" listing, carrying the entire cart as line items plus
delivery and platform fee. The buyer sees one authorisation on their statement and gets one receipt email.
This pattern already exists in the codebase — the standalone delivery fee works exactly this way today
(`REACT_APP_DELIVERY_LISTING_ID`), so it is an extension of something proven, not a new invention.

**The fulfilment leg — $0 transactions, no payment attached.**
One transaction per cart line item, carrying only the accept / decline / fulfil workflow that vendors already
use. No money moves through these. Critically, each stays anchored to its real listing, so Sharetribe's native
stock reservation keeps working untouched — this is the piece that makes the approach safe.

**The payout leg.**
When a vendor fulfils, FarmFed's server transfers their share from the platform balance to their connected
Stripe account, referenced back to the original payment.

Everything is tied together by the shared order ID already used throughout the system.

### The business benefits

- **Buyer sees one charge and one receipt.** The original complaint, resolved.
- **Stripe's fixed per-charge fee is paid once per order instead of once per item.** On a five-item order
  that's four fewer fixed fees. Note the percentage component of Stripe's fee scales with order value and is
  unchanged — the saving is the fixed portion only, so the benefit grows with *item count*, not order size.
- **Partial refunds get easier.** If one farm declines, that amount is refunded off the single payment and
  that vendor simply isn't paid. Today this means unwinding one charge out of several.

### The honest caveats

- **This does not reduce the Sharetribe transaction count.** There is still one money transaction plus one
  fulfilment transaction per item. Whether that matters financially depends on an open question — see section 5.
- **The hardest part is ordering, and it carries real risk.** The buyer must not be charged for produce that
  sold out while they were checking out. The sequence has to be: reserve all stock first, then charge, then
  confirm — with a clean rollback if any step fails. This is a coordination problem across two separate
  systems that have no shared undo button. It is the main driver of the timeline and the main source of
  engineering risk.

---

## 4. What FarmFed is being asked to accept

This is the decision. Taking payment onto FarmFed's own Stripe account makes **FarmFed the merchant of
record** — legally the seller of the goods, rather than a platform connecting buyers to farms. Consequences:

- **Chargeback liability moves to FarmFed.** Today a disputed charge is against the vendor's account. After
  this change, disputes land on FarmFed, along with Stripe's dispute fees. FarmFed would need a process for
  recovering those amounts from vendors, or absorb them.
- **Refunds become FarmFed's obligation.** Money will already have been transferred out to vendors by the time
  many refund requests arrive. FarmFed pays the buyer back and reclaims from the vendor.
- **Tax reporting obligations likely change.** Paying vendors from FarmFed's own balance rather than routing
  payments directly to them will probably trigger 1099-K issuance responsibilities, and may have sales tax
  implications depending on state. **This needs review by an accountant before proceeding — engineering is
  flagging it, not advising on it.**
- **Vendor agreements likely need updating** to reflect that FarmFed collects on their behalf and remits.
- **Float and reconciliation.** Money sits on FarmFed's balance between purchase and vendor payout. That is a
  cash-flow position and a bookkeeping obligation that doesn't exist today.

None of these are reasons not to do it — most marketplaces of any size operate this way. But they are real
obligations, and they are the reason engineering will not start until there's an explicit yes.

---

## 5. Open question for Sharetribe

**Is Sharetribe's transaction volume fee a percentage of transaction value, or a flat amount per
transaction?**

This changes the return on the work and should be asked before committing:

- **If percentage of value:** the $0 fulfilment transactions cost nothing, and the Sharetribe bill drops
  alongside the Stripe saving.
- **If flat per transaction:** this project fixes the buyer experience and the Stripe fixed fees, but the
  Sharetribe bill is unchanged.

Cheap to find out. Worth knowing before signing off.

---

## 6. Options considered and rejected

**Send one consolidated receipt email, change nothing else (~1 week).** Reduces the email noise but the card
is still charged per item, so it doesn't address the actual complaint. It also requires standing up an email
provider, which is most of its cost — and the recommended approach produces its single receipt natively,
making that infrastructure disposable. Not recommended as a stepping stone; it would be thrown away.

**Group the cart by farm, one transaction per vendor (2–3 weeks).** Reduces charges from per-item to
per-farm — an improvement, not a fix. The problem is that it breaks Sharetribe's native stock reservation for
every product except one per vendor, requiring hand-built inventory management. On a perishable-goods
marketplace, the failure mode is selling produce that doesn't exist. The time saved is not worth that class of
bug.

---

## 7. Recommendation and timeline

Proceed with the single-charge approach, but only after both questions below are closed.

**Decisions needed:**

1. Merchant-of-record — yes or no, ideally with an accountant's read on the 1099-K and sales tax points.
2. Sharetribe's fee structure — a question for their support team.

**Timeline:** 4–6 weeks of engineering. **The clock starts at sign-off, not today.** If the business decision
takes three weeks, delivery is three weeks later than it otherwise would be. Flagging this now rather than
later.

**Meanwhile:** cart checkout UI (mobile and desktop) and the product listings UI are unblocked by this
decision and can proceed in parallel.

**Until this ships, cards continue to be charged per item.** There is no inexpensive partial fix that changes
that — which is the core reason for recommending the full approach rather than an interim one.
