export const MAX_QTY = 5;

// ACTION TYPES
export const ADD_TO_CART = "cart/add";
export const REMOVE_FROM_CART = "cart/remove";
export const CLEAR_CART = "cart/clear";
export const ORDER_REQUEST = "cart/orderRequest";
export const ORDER_SUCCESS = "cart/orderSuccess";
export const ORDER_FAILURE = "cart/orderFailure";

// ACTION CREATORS
export const addToCart = (product) => ({ type: ADD_TO_CART, payload: product });
export const removeFromCart = (id) => ({ type: REMOVE_FROM_CART, payload: id });
export const clearCart = () => ({ type: CLEAR_CART });
export const orderRequest = () => ({ type: ORDER_REQUEST });
export const orderSuccess = (orderId) => ({ type: ORDER_SUCCESS, payload: orderId });
export const orderFailure = (message) => ({ type: ORDER_FAILURE, payload: message });

// SELECTORS: read values out of the state (they return numbers, so they are cheap to compare)
export const selectCartCount = (state) =>
  Object.values(state.items).reduce((sum, line) => sum + line.qty, 0);
export const selectCartTotal = (state) =>
  Object.values(state.items).reduce((sum, line) => sum + line.price * line.qty, 0);

const initialState = { items: {}, order: { status: "idle", id: null, error: null } };

// REDUCER
function cartReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_TO_CART: {
      const product = action.payload;
      const existing = state.items[product.id];
      if (existing) {
        if (existing.qty >= MAX_QTY) return state; // limit reached: nothing changes
        return {
          ...state,
          items: { ...state.items, [product.id]: { ...existing, qty: existing.qty + 1 } },
        };
      }
      return {
        ...state,
        items: {
          ...state.items,
          [product.id]: { id: product.id, name: product.name, price: product.price, qty: 1 },
        },
      };
    }

    case REMOVE_FROM_CART: {
      const existing = state.items[action.payload];
      if (!existing) return state;
      if (existing.qty <= 1) {
        const items = { ...state.items };
        delete items[action.payload];
        return { ...state, items };
      }
      return {
        ...state,
        items: { ...state.items, [action.payload]: { ...existing, qty: existing.qty - 1 } },
      };
    }

    case CLEAR_CART:
      return { ...state, items: {} };

    case ORDER_REQUEST:
      return { ...state, order: { status: "loading", id: null, error: null } };

    case ORDER_SUCCESS:
      return { items: {}, order: { status: "success", id: action.payload, error: null } };

    case ORDER_FAILURE:
      return { ...state, order: { status: "error", id: null, error: action.payload } }; // cart kept

    default:
      return state;
  }
}

export default cartReducer;
