import reducer, {
  processCartCheckout,
  speculateCartItem,
  setCurrentItemIndex,
  resetCheckout,
} from './CartCheckoutPage.duck';

describe('CartCheckoutPage duck', () => {
  describe('reducer', () => {
    const initialState = reducer(undefined, { type: '@@INIT' });

    it('should return initial state', () => {
      expect(initialState.speculatedTransactions).toEqual({});
      expect(initialState.speculateInProgress).toBe(false);
      expect(initialState.speculateError).toBeNull();
      expect(initialState.checkoutInProgress).toBe(false);
      expect(initialState.currentItemIndex).toBe(0);
      expect(initialState.completedResults).toBeNull();
      expect(initialState.checkoutError).toBeNull();
    });

    it('should handle setCurrentItemIndex', () => {
      const state = reducer(initialState, setCurrentItemIndex(3));
      expect(state.currentItemIndex).toBe(3);
    });

    it('should handle resetCheckout', () => {
      let state = reducer(initialState, setCurrentItemIndex(3));
      state = reducer(state, {
        type: processCartCheckout.pending.type,
        meta: { arg: {} },
      });
      state = reducer(state, resetCheckout());

      expect(state).toEqual(initialState);
    });

    describe('processCartCheckout', () => {
      it('should set checkoutInProgress on pending', () => {
        const state = reducer(initialState, {
          type: processCartCheckout.pending.type,
          meta: { arg: {} },
        });

        expect(state.checkoutInProgress).toBe(true);
        expect(state.currentItemIndex).toBe(0);
        expect(state.completedResults).toBeNull();
        expect(state.checkoutError).toBeNull();
      });

      it('should store results on fulfilled', () => {
        let state = reducer(initialState, {
          type: processCartCheckout.pending.type,
          meta: { arg: {} },
        });

        const payload = {
          results: [{ listingId: 'l1', orderId: 'o1', success: true }],
          allSucceeded: true,
        };

        state = reducer(state, {
          type: processCartCheckout.fulfilled.type,
          payload,
        });

        expect(state.checkoutInProgress).toBe(false);
        expect(state.completedResults).toEqual(payload);
        expect(state.checkoutError).toBeNull();
      });

      it('should store error on rejected', () => {
        let state = reducer(initialState, {
          type: processCartCheckout.pending.type,
          meta: { arg: {} },
        });

        const payload = {
          results: [{ listingId: 'l1', success: false, error: 'Card declined' }],
          error: 'Payment declined. Please check your card details.',
        };

        state = reducer(state, {
          type: processCartCheckout.rejected.type,
          payload,
        });

        expect(state.checkoutInProgress).toBe(false);
        expect(state.checkoutError).toBe('Payment declined. Please check your card details.');
        expect(state.completedResults).toEqual(payload);
      });

      it('should use fallback error message when no payload error', () => {
        let state = reducer(initialState, {
          type: processCartCheckout.pending.type,
          meta: { arg: {} },
        });

        state = reducer(state, {
          type: processCartCheckout.rejected.type,
          payload: undefined,
        });

        expect(state.checkoutError).toBe('Checkout failed');
      });
    });

    describe('speculateCartItem', () => {
      it('should set speculateInProgress on pending', () => {
        const state = reducer(initialState, {
          type: speculateCartItem.pending.type,
          meta: { arg: {} },
        });

        expect(state.speculateInProgress).toBe(true);
      });

      it('should store speculated transaction on fulfilled', () => {
        let state = reducer(initialState, {
          type: speculateCartItem.pending.type,
          meta: { arg: {} },
        });

        state = reducer(state, {
          type: speculateCartItem.fulfilled.type,
          payload: { listingId: 'l1', transaction: { id: 'tx1' } },
        });

        expect(state.speculateInProgress).toBe(false);
        expect(state.speculatedTransactions['l1']).toEqual({ id: 'tx1' });
      });

      it('should handle speculate rejection', () => {
        let state = reducer(initialState, {
          type: speculateCartItem.pending.type,
          meta: { arg: {} },
        });

        state = reducer(state, {
          type: speculateCartItem.rejected.type,
          payload: { listingId: 'l1', error: 'Some error' },
        });

        expect(state.speculateInProgress).toBe(false);
        expect(state.speculateError).toBe('Some error');
      });
    });
  });
});
