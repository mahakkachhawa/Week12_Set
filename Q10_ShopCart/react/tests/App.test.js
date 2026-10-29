import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { legacy_createStore as createStore } from "redux";
import "@testing-library/jest-dom";
import axios from "axios";
import cartReducer, {
  addToCart,
  removeFromCart,
  clearCart,
  orderRequest,
  orderSuccess,
  orderFailure,
  selectCartCount,
  selectCartTotal,
  ADD_TO_CART,
  REMOVE_FROM_CART,
  CLEAR_CART,
  ORDER_REQUEST,
  ORDER_SUCCESS,
  ORDER_FAILURE,
} from "../redux/cart";
import App from "../App";

jest.mock("axios");

const PRODUCTS_URL = "https://shop.example.com/api/products";
const ORDERS_URL = "https://shop.example.com/api/orders";
const PRODUCTS = [
  { id: 1, name: "Pen", price: 100 },
  { id: 2, name: "Book", price: 50 },
  { id: 3, name: "Bag", price: 400 },
];
const START = { type: "@@TEST_INIT" };
const IDLE = { status: "idle", id: null, error: null };

const okResponse = (data) => ({ ok: true, status: 200, json: () => Promise.resolve(data) });
const badResponse = (status) => ({ ok: false, status, json: () => Promise.resolve({}) });

const deepFreeze = (value) => {
  Object.freeze(value);
  Object.values(value).forEach((inner) => {
    if (typeof inner === "object" && inner !== null && !Object.isFrozen(inner)) deepFreeze(inner);
  });
  return value;
};

const apply = (state, ...actions) => actions.reduce((current, action) => cartReducer(current, action), state);

const q = (container, selector) => container.querySelector(selector);
const text = (container, selector) => q(container, selector).textContent;
const click = (container, selector, times = 1) => {
  for (let i = 0; i < times; i++) fireEvent.click(q(container, selector));
};

// Renders the app with a fresh store and waits until the products are on the screen
const renderShop = async () => {
  global.fetch = jest.fn().mockResolvedValue(okResponse(PRODUCTS));
  const store = createStore(cartReducer);
  const utils = render(
    <Provider store={store}>
      <App />
    </Provider>
  );
  await waitFor(() => expect(q(utils.container, "#productList")).toBeInTheDocument());
  return { store, ...utils };
};

afterEach(() => {
  delete global.fetch;
});

describe("Shop Cart App (Redux cart + fetch products + axios order)", () => {
  test("verify_cart_reducer_adds_removes_and_limits_quantities", () => {
    expect(cartReducer(undefined, START)).toEqual({ items: {}, order: IDLE });
    expect([ADD_TO_CART, REMOVE_FROM_CART, CLEAR_CART, ORDER_REQUEST, ORDER_SUCCESS, ORDER_FAILURE]).toEqual([
      "cart/add",
      "cart/remove",
      "cart/clear",
      "cart/orderRequest",
      "cart/orderSuccess",
      "cart/orderFailure",
    ]);
    expect(addToCart(PRODUCTS[0])).toEqual({ type: "cart/add", payload: PRODUCTS[0] });
    expect(removeFromCart(1)).toEqual({ type: "cart/remove", payload: 1 });

    const one = apply(undefined, addToCart(PRODUCTS[0]));
    expect(one.items[1]).toEqual({ id: 1, name: "Pen", price: 100, qty: 1 });

    const two = apply(one, addToCart(PRODUCTS[0]), addToCart(PRODUCTS[1]));
    expect(two.items[1].qty).toBe(2);
    expect(two.items[2].qty).toBe(1);

    const full = apply(undefined, ...Array(5).fill(addToCart(PRODUCTS[2])));
    expect(full.items[3].qty).toBe(5);
    expect(cartReducer(full, addToCart(PRODUCTS[2]))).toBe(full); // limit: same state

    const lowered = cartReducer(two, removeFromCart(1));
    expect(lowered.items[1].qty).toBe(1);
    const deleted = cartReducer(lowered, removeFromCart(1));
    expect(deleted.items[1]).toBeUndefined();
    expect(Object.keys(deleted.items)).toEqual(["2"]);
    expect(cartReducer(deleted, removeFromCart(99))).toBe(deleted);
  });

  test("verify_cart_reducer_clears_the_cart_and_handles_the_order_steps", () => {
    const filled = apply(undefined, addToCart(PRODUCTS[0]), addToCart(PRODUCTS[1]));

    expect(cartReducer(filled, clearCart())).toEqual({ items: {}, order: IDLE });

    const loading = cartReducer(filled, orderRequest());
    expect(loading.order).toEqual({ status: "loading", id: null, error: null });
    expect(loading.items).toEqual(filled.items);

    const success = cartReducer(loading, orderSuccess("A100"));
    expect(success).toEqual({ items: {}, order: { status: "success", id: "A100", error: null } });

    const failure = cartReducer(loading, orderFailure("Server error: 500"));
    expect(failure.order).toEqual({ status: "error", id: null, error: "Server error: 500" });
    expect(failure.items).toEqual(filled.items); // the cart is kept after a failure

    const frozen = deepFreeze(apply(undefined, addToCart(PRODUCTS[0])));
    [addToCart(PRODUCTS[1]), removeFromCart(1), clearCart(), orderRequest(), orderSuccess("x"), orderFailure("y")].forEach(
      (action) => {
        expect(cartReducer(frozen, action)).not.toBe(frozen);
      }
    );
  });

  test("verify_selectors_calculate_the_item_count_and_the_total", () => {
    const state = apply(
      undefined,
      addToCart(PRODUCTS[0]),
      addToCart(PRODUCTS[0]),
      addToCart(PRODUCTS[1])
    );
    expect(selectCartCount(state)).toBe(3);
    expect(selectCartTotal(state)).toBe(250);

    const empty = cartReducer(undefined, START);
    expect(selectCartCount(empty)).toBe(0);
    expect(selectCartTotal(empty)).toBe(0);
  });

  test("verify_products_are_requested_with_fetch_and_listed_after_loading", async () => {
    let resolveRequest;
    global.fetch = jest.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    const store = createStore(cartReducer);
    const { container } = render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(PRODUCTS_URL);
    expect(text(container, "#productsLoading")).toBe("Loading products...");

    await act(async () => {
      resolveRequest(okResponse(PRODUCTS));
    });
    await waitFor(() => expect(q(container, "#productList")).toBeInTheDocument());
    expect(q(container, "#productsLoading")).not.toBeInTheDocument();
    expect(text(container, "#product-1")).toContain("Pen");
    expect(text(container, "#product-3")).toContain("Bag");
  });

  test("verify_product_loading_errors_can_be_retried", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(badResponse(503))
      .mockResolvedValueOnce(okResponse(PRODUCTS));
    const store = createStore(cartReducer);
    const { container } = render(
      <Provider store={store}>
        <App />
      </Provider>
    );
    await waitFor(() => expect(q(container, "#productsError")).toBeInTheDocument());
    expect(text(container, "#productsError")).toBe("Failed to load products (status 503)");
    expect(q(container, "#productList")).not.toBeInTheDocument();

    click(container, "#productsRetryBtn");
    await waitFor(() => expect(q(container, "#productList")).toBeInTheDocument());
    expect(q(container, "#productsError")).not.toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("verify_add_to_cart_updates_the_cart_lines_count_and_total_from_the_store", async () => {
    const { container, store } = await renderShop();
    expect(text(container, "#cartEmpty")).toBe("Your cart is empty");

    click(container, "#add-1");
    expect(text(container, "#cart-1")).toContain("Pen x 1");
    click(container, "#add-1");
    click(container, "#add-2");

    expect(text(container, "#cart-1")).toContain("Pen x 2");
    expect(text(container, "#cart-2")).toContain("Book x 1");
    expect(text(container, "#cartCount")).toBe("3");
    expect(text(container, "#cartTotal")).toBe("250");
    expect(q(container, "#cartEmpty")).not.toBeInTheDocument();
    expect(store.getState().items[1].qty).toBe(2);
  });

  test("verify_remove_button_lowers_the_quantity_and_the_limit_is_five_per_product", async () => {
    const { container } = await renderShop();
    click(container, "#add-1", 2);
    click(container, "#remove-1");
    expect(text(container, "#cart-1")).toContain("Pen x 1");
    click(container, "#remove-1");
    expect(q(container, "#cart-1")).not.toBeInTheDocument();
    expect(text(container, "#cartCount")).toBe("0");

    click(container, "#add-3", 7);
    expect(text(container, "#cart-3")).toContain("Bag x 5");
    expect(text(container, "#cartTotal")).toBe("2000");
  });

  test("verify_place_order_posts_the_cart_shows_loading_then_success_and_empties_the_cart", async () => {
    let resolveOrder;
    axios.post.mockReturnValue(
      new Promise((resolve) => {
        resolveOrder = resolve;
      })
    );
    const { container, store } = await renderShop();
    click(container, "#add-2");
    click(container, "#add-1", 2);

    click(container, "#checkoutBtn");
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(ORDERS_URL, {
      items: [
        { id: 1, qty: 2 },
        { id: 2, qty: 1 },
      ],
      total: 250,
    });
    expect(text(container, "#orderLoading")).toBe("Placing order...");
    expect(q(container, "#checkoutBtn")).toBeDisabled();

    await act(async () => {
      resolveOrder({ data: { id: "A100" } });
    });
    await waitFor(() => expect(q(container, "#orderSuccess")).toBeInTheDocument());
    expect(text(container, "#orderSuccess")).toBe("Order placed! Order id: A100");
    expect(q(container, "#orderLoading")).not.toBeInTheDocument();
    expect(text(container, "#cartEmpty")).toBe("Your cart is empty");
    expect(text(container, "#cartCount")).toBe("0");
    expect(store.getState().items).toEqual({});
  });

  test("verify_failed_order_shows_the_error_and_keeps_the_cart", async () => {
    axios.post.mockRejectedValueOnce({ response: { status: 500 } });
    const { container, store } = await renderShop();
    click(container, "#add-1");
    click(container, "#checkoutBtn");

    await waitFor(() => expect(q(container, "#orderError")).toBeInTheDocument());
    expect(text(container, "#orderError")).toBe("Server error: 500");
    expect(text(container, "#cart-1")).toContain("Pen x 1");
    expect(q(container, "#checkoutBtn")).toBeEnabled();
    expect(store.getState().items[1].qty).toBe(1);

    axios.post.mockRejectedValueOnce(new Error("Network Error"));
    click(container, "#checkoutBtn");
    await waitFor(() => expect(text(container, "#orderError")).toBe("Network error: Network Error"));
  });

  test("verify_place_order_is_disabled_for_an_empty_cart_and_sends_only_one_request_while_loading", async () => {
    let resolveOrder;
    axios.post.mockReturnValue(
      new Promise((resolve) => {
        resolveOrder = resolve;
      })
    );
    const { container } = await renderShop();
    expect(q(container, "#checkoutBtn")).toBeDisabled();
    click(container, "#checkoutBtn");
    expect(axios.post).not.toHaveBeenCalled();

    click(container, "#add-2");
    expect(q(container, "#checkoutBtn")).toBeEnabled();
    click(container, "#checkoutBtn", 3);
    expect(axios.post).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveOrder({ data: { id: "B7" } });
    });
    await waitFor(() => expect(q(container, "#orderSuccess")).toBeInTheDocument());
  });
});
