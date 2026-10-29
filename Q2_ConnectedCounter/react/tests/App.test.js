import React from "react";
import { render, fireEvent, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { legacy_createStore as createStore } from "redux";
import "@testing-library/jest-dom";
import counterReducer, { increment, addAmount } from "../redux/counter";
import App from "../App";

// The test creates the store and gives it to the app through the Provider
const renderApp = (preloadedState) => {
  const store = preloadedState ? createStore(counterReducer, preloadedState) : createStore(counterReducer);
  const utils = render(
    <Provider store={store}>
      <App />
    </Provider>
  );
  return { store, ...utils };
};

const q = (container, selector) => container.querySelector(selector);
const text = (container, selector) => q(container, selector).textContent;
const click = (container, selector) => fireEvent.click(q(container, selector));
const typeAmount = (container, value) =>
  fireEvent.change(q(container, "#amountInput"), { target: { value } });
const historyItems = (container) =>
  Array.from(container.querySelectorAll("#historyList li")).map((li) => li.textContent);

describe("Connected Counter App (Provider, useSelector, useDispatch)", () => {
  test("verify_components_show_the_state_that_is_already_in_the_store", () => {
    const { container } = renderApp({ count: 5, history: ["+5"] });
    expect(text(container, "#count")).toBe("5");
    expect(historyItems(container)).toEqual(["+5"]);
    expect(text(container, "#historyCount")).toBe("Operations: 1");
  });

  test("verify_increment_button_updates_the_store_and_the_display", () => {
    const { container, store } = renderApp();
    expect(text(container, "#count")).toBe("0");
    click(container, "#incrementBtn");
    expect(text(container, "#count")).toBe("1");
    expect(store.getState().count).toBe(1);
  });

  test("verify_decrement_button_never_goes_below_zero", () => {
    const { container, store } = renderApp();
    click(container, "#decrementBtn");
    expect(text(container, "#count")).toBe("0");

    click(container, "#incrementBtn");
    click(container, "#incrementBtn");
    click(container, "#decrementBtn");
    expect(text(container, "#count")).toBe("1");
    expect(store.getState()).toEqual({ count: 1, history: ["+1", "+1", "-1"] });
  });

  test("verify_valid_amount_is_added_and_the_input_is_cleared", () => {
    const { container, store } = renderApp();
    typeAmount(container, "5");
    click(container, "#addBtn");
    expect(text(container, "#count")).toBe("5");
    expect(q(container, "#amountInput").value).toBe("");
    expect(store.getState()).toEqual({ count: 5, history: ["+5"] });
  });

  test("verify_invalid_amounts_show_an_error_and_are_never_dispatched", () => {
    const { container, store } = renderApp();
    const spy = jest.spyOn(store, "dispatch");

    ["0", "-3", "2.5", ""].forEach((value) => {
      typeAmount(container, value);
      click(container, "#addBtn");
      expect(text(container, "#amountError")).toBe("Enter a whole number above 0");
    });

    expect(spy).not.toHaveBeenCalled();
    expect(store.getState()).toEqual({ count: 0, history: [] });
  });

  test("verify_error_disappears_when_typing_and_after_a_valid_add", () => {
    const { container } = renderApp();
    click(container, "#addBtn");
    expect(q(container, "#amountError")).toBeInTheDocument();

    typeAmount(container, "4");
    expect(q(container, "#amountError")).not.toBeInTheDocument();

    click(container, "#addBtn");
    expect(q(container, "#amountError")).not.toBeInTheDocument();
    expect(text(container, "#count")).toBe("4");
  });

  test("verify_history_list_shows_the_operations_in_order_with_a_count", () => {
    const { container } = renderApp();
    click(container, "#incrementBtn");
    typeAmount(container, "5");
    click(container, "#addBtn");
    click(container, "#decrementBtn");

    expect(historyItems(container)).toEqual(["+1", "+5", "-1"]);
    expect(text(container, "#historyCount")).toBe("Operations: 3");
  });

  test("verify_empty_history_shows_a_message_instead_of_a_list", () => {
    const { container } = renderApp();
    expect(text(container, "#historyEmpty")).toBe("No operations yet");
    expect(q(container, "#historyList")).not.toBeInTheDocument();
    expect(text(container, "#historyCount")).toBe("Operations: 0");

    click(container, "#incrementBtn");
    expect(q(container, "#historyEmpty")).not.toBeInTheDocument();
    expect(q(container, "#historyList")).toBeInTheDocument();
  });

  test("verify_reset_button_clears_the_count_and_the_history", () => {
    const { container, store } = renderApp();
    click(container, "#incrementBtn");
    typeAmount(container, "7");
    click(container, "#addBtn");
    click(container, "#resetBtn");

    expect(text(container, "#count")).toBe("0");
    expect(q(container, "#historyList")).not.toBeInTheDocument();
    expect(store.getState()).toEqual({ count: 0, history: [] });
  });

  test("verify_components_update_when_the_store_changes_from_outside", () => {
    const { container, store } = renderApp();
    act(() => {
      store.dispatch(increment());
    });
    expect(text(container, "#count")).toBe("1");

    act(() => {
      store.dispatch(addAmount(4));
    });
    expect(text(container, "#count")).toBe("5");
    expect(historyItems(container)).toEqual(["+1", "+4"]);
  });
});
