import { legacy_createStore as createStore } from "redux";
import counterReducer, {
  increment,
  decrement,
  addAmount,
  reset,
  INCREMENT,
  DECREMENT,
  ADD_AMOUNT,
  RESET,
} from "../redux/counter";
import store from "../redux/store";

const INITIAL = { count: 0, history: [] };
const START = { type: "@@TEST_INIT" };

const deepFreeze = (value) => {
  Object.freeze(value);
  Object.values(value).forEach((inner) => {
    if (typeof inner === "object" && inner !== null && !Object.isFrozen(inner)) deepFreeze(inner);
  });
  return value;
};

// Runs a list of actions through the reducer, starting from the initial state
const run = (actions) => actions.reduce((state, action) => counterReducer(state, action), undefined);

describe("Counter Store (Redux core)", () => {
  test("verify_reducer_returns_the_initial_state_when_state_is_undefined", () => {
    expect(counterReducer(undefined, START)).toEqual(INITIAL);
  });

  test("verify_action_creators_return_plain_action_objects", () => {
    expect([INCREMENT, DECREMENT, ADD_AMOUNT, RESET]).toEqual([
      "INCREMENT",
      "DECREMENT",
      "ADD_AMOUNT",
      "RESET",
    ]);
    expect(increment()).toEqual({ type: "INCREMENT" });
    expect(decrement()).toEqual({ type: "DECREMENT" });
    expect(addAmount(5)).toEqual({ type: "ADD_AMOUNT", payload: 5 });
    expect(reset()).toEqual({ type: "RESET" });
  });

  test("verify_increment_adds_one_and_records_history", () => {
    expect(run([increment()])).toEqual({ count: 1, history: ["+1"] });
    expect(run([increment(), increment()])).toEqual({ count: 2, history: ["+1", "+1"] });
  });

  test("verify_decrement_subtracts_one_but_never_goes_below_zero", () => {
    expect(run([increment(), increment(), decrement()])).toEqual({
      count: 1,
      history: ["+1", "+1", "-1"],
    });

    const atZero = counterReducer(undefined, START);
    expect(counterReducer(atZero, decrement())).toBe(atZero); // same state, no history entry
  });

  test("verify_add_amount_adds_valid_whole_numbers_and_ignores_invalid_ones", () => {
    expect(run([addAmount(5)])).toEqual({ count: 5, history: ["+5"] });
    expect(run([increment(), addAmount(10)])).toEqual({ count: 11, history: ["+1", "+10"] });

    const state = run([increment()]);
    [0, -3, 2.5, "7", undefined, null].forEach((bad) => {
      expect(counterReducer(state, addAmount(bad))).toBe(state);
    });
  });

  test("verify_reset_returns_the_initial_state", () => {
    const changed = run([increment(), addAmount(4), decrement()]);
    expect(changed.count).toBe(4);
    expect(counterReducer(changed, reset())).toEqual(INITIAL);
  });

  test("verify_reducer_never_mutates_the_previous_state", () => {
    const previous = deepFreeze(run([increment(), increment()]));

    [increment(), decrement(), addAmount(3), reset()].forEach((action) => {
      const next = counterReducer(previous, action); // would throw on a frozen object if mutated
      expect(next).not.toBe(previous);
      expect(next.history).not.toBe(previous.history);
    });
    expect(previous).toEqual({ count: 2, history: ["+1", "+1"] });
  });

  test("verify_unknown_action_returns_the_same_state_object", () => {
    const state = run([increment()]);
    expect(counterReducer(state, { type: "SOMETHING_ELSE" })).toBe(state);
    expect(counterReducer(state, { type: "SOMETHING_ELSE", payload: 1 })).toBe(state);
  });

  test("verify_store_holds_the_state_and_updates_on_dispatch", () => {
    expect(typeof store.getState).toBe("function");
    expect(typeof store.dispatch).toBe("function");
    expect(typeof store.subscribe).toBe("function");

    store.dispatch(reset());
    expect(store.getState()).toEqual(INITIAL);

    store.dispatch(increment());
    store.dispatch(addAmount(4));
    expect(store.getState()).toEqual({ count: 5, history: ["+1", "+4"] });

    store.dispatch(reset());
    expect(store.getState()).toEqual(INITIAL);
  });

  test("verify_subscribers_are_notified_after_each_dispatch_until_they_unsubscribe", () => {
    const freshStore = createStore(counterReducer);
    const listener = jest.fn(() => freshStore.getState().count);

    const unsubscribe = freshStore.subscribe(listener);
    freshStore.dispatch(increment());
    freshStore.dispatch(increment());
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveLastReturnedWith(2);

    unsubscribe();
    freshStore.dispatch(increment());
    expect(listener).toHaveBeenCalledTimes(2);
    expect(freshStore.getState().count).toBe(3);
  });
});
