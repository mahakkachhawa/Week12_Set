import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { legacy_createStore as createStore } from "redux";
import "@testing-library/jest-dom";
import usersReducer, {
  fetchUsersRequest,
  fetchUsersSuccess,
  fetchUsersFailure,
  selectUser,
  FETCH_REQUEST,
  FETCH_SUCCESS,
  FETCH_FAILURE,
  SELECT_USER,
} from "../redux/users";
import App from "../App";

const USERS_URL = "https://jsonplaceholder.typicode.com/users";
const USERS = [
  { id: 1, name: "Leanne Graham", email: "leanne@mail.com" },
  { id: 2, name: "Ervin Howell", email: "ervin@mail.com" },
];
const START = { type: "@@TEST_INIT" };
const INITIAL = { loading: false, error: null, users: [], selectedId: null };

const okResponse = (data) => ({ ok: true, status: 200, json: () => Promise.resolve(data) });
const badResponse = (status) => ({ ok: false, status, json: () => Promise.resolve({}) });

const deepFreeze = (value) => {
  Object.freeze(value);
  Object.values(value).forEach((inner) => {
    if (typeof inner === "object" && inner !== null && !Object.isFrozen(inner)) deepFreeze(inner);
  });
  return value;
};

const renderApp = () => {
  const store = createStore(usersReducer);
  const snapshots = [];
  store.subscribe(() => snapshots.push(store.getState()));
  const utils = render(
    <Provider store={store}>
      <App />
    </Provider>
  );
  return { store, snapshots, ...utils };
};

const q = (container, selector) => container.querySelector(selector);
const text = (container, selector) => q(container, selector).textContent;
const waitForList = (container) =>
  waitFor(() => expect(q(container, "#userList")).toBeInTheDocument());

afterEach(() => {
  delete global.fetch;
});

describe("Redux Users App (request / success / failure flow)", () => {
  test("verify_initial_state_and_action_creators", () => {
    expect(usersReducer(undefined, START)).toEqual(INITIAL);
    expect([FETCH_REQUEST, FETCH_SUCCESS, FETCH_FAILURE, SELECT_USER]).toEqual([
      "users/fetchRequest",
      "users/fetchSuccess",
      "users/fetchFailure",
      "users/select",
    ]);
    expect(fetchUsersRequest()).toEqual({ type: "users/fetchRequest" });
    expect(fetchUsersSuccess(USERS)).toEqual({ type: "users/fetchSuccess", payload: USERS });
    expect(fetchUsersFailure("Oops")).toEqual({ type: "users/fetchFailure", payload: "Oops" });
    expect(selectUser(3)).toEqual({ type: "users/select", payload: 3 });
  });

  test("verify_request_starts_loading_and_failure_stops_it_but_keeps_the_users", () => {
    const withError = { ...INITIAL, error: "old error", users: USERS };
    const loading = usersReducer(withError, fetchUsersRequest());
    expect(loading).toEqual({ loading: true, error: null, users: USERS, selectedId: null });

    const failed = usersReducer(loading, fetchUsersFailure("Network error: boom"));
    expect(failed).toEqual({
      loading: false,
      error: "Network error: boom",
      users: USERS,
      selectedId: null,
    });
  });

  test("verify_success_stores_the_users_and_keeps_a_selection_only_if_the_user_still_exists", () => {
    const loading = usersReducer(undefined, fetchUsersRequest());
    const loaded = usersReducer(loading, fetchUsersSuccess(USERS));
    expect(loaded).toEqual({ loading: false, error: null, users: USERS, selectedId: null });

    const selected = usersReducer(loaded, selectUser(2));
    expect(selected.selectedId).toBe(2);

    const reloadedSame = usersReducer(selected, fetchUsersSuccess(USERS));
    expect(reloadedSame.selectedId).toBe(2);

    const reloadedWithout = usersReducer(selected, fetchUsersSuccess([USERS[0]]));
    expect(reloadedWithout.selectedId).toBeNull();
  });

  test("verify_reducer_never_mutates_the_previous_state", () => {
    const previous = deepFreeze({ loading: false, error: "x", users: [...USERS], selectedId: 1 });
    [
      fetchUsersRequest(),
      fetchUsersSuccess(USERS),
      fetchUsersFailure("fail"),
      selectUser(2),
    ].forEach((action) => {
      const next = usersReducer(previous, action); // throws if a frozen object is changed
      expect(next).not.toBe(previous);
    });
    expect(previous.selectedId).toBe(1);
    expect(usersReducer(previous, { type: "UNKNOWN" })).toBe(previous);
  });

  test("verify_component_requests_users_once_and_the_store_goes_through_loading_to_loaded", async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse(USERS));
    const { container, store, snapshots } = renderApp();
    await waitForList(container);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(USERS_URL);
    expect(snapshots[0].loading).toBe(true);
    expect(snapshots[snapshots.length - 1].loading).toBe(false);
    expect(store.getState().users).toEqual(USERS);
  });

  test("verify_loading_text_is_shown_while_waiting_and_users_are_listed_after", async () => {
    let resolveRequest;
    global.fetch = jest.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    const { container } = renderApp();
    expect(text(container, "#loading")).toBe("Loading users...");
    expect(q(container, "#reloadBtn")).toBeDisabled();

    await act(async () => {
      resolveRequest(okResponse(USERS));
    });
    await waitForList(container);
    expect(q(container, "#loading")).not.toBeInTheDocument();
    expect(q(container, "#reloadBtn")).toBeEnabled();
    expect(text(container, "#user-1")).toContain("Leanne Graham");
    expect(text(container, "#user-2")).toContain("Ervin Howell");
  });

  test("verify_error_status_response_is_stored_and_shown", async () => {
    global.fetch = jest.fn().mockResolvedValue(badResponse(500));
    const { container, store } = renderApp();
    await waitFor(() => expect(q(container, "#error")).toBeInTheDocument());
    expect(text(container, "#error")).toBe("Failed to load users (status 500)");
    expect(store.getState().error).toBe("Failed to load users (status 500)");
    expect(q(container, "#loading")).not.toBeInTheDocument();
    expect(q(container, "#userList")).not.toBeInTheDocument();
  });

  test("verify_network_failure_is_stored_and_shown", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Failed to fetch"));
    const { container, store } = renderApp();
    await waitFor(() => expect(q(container, "#error")).toBeInTheDocument());
    expect(text(container, "#error")).toBe("Network error: Failed to fetch");
    expect(store.getState().loading).toBe(false);
  });

  test("verify_view_button_selects_a_user_and_shows_the_details_from_the_store", async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse(USERS));
    const { container, store } = renderApp();
    await waitForList(container);

    expect(text(container, "#noSelection")).toBe("Select a user to see details");
    expect(q(container, "#userDetails")).not.toBeInTheDocument();

    fireEvent.click(q(container, "#view-2"));
    expect(store.getState().selectedId).toBe(2);
    expect(text(container, "#detailName")).toBe("Name: Ervin Howell");
    expect(text(container, "#detailEmail")).toBe("Email: ervin@mail.com");
    expect(q(container, "#noSelection")).not.toBeInTheDocument();

    fireEvent.click(q(container, "#view-1"));
    expect(text(container, "#detailName")).toBe("Name: Leanne Graham");
  });

  test("verify_reload_button_requests_again_clears_the_error_and_updates_the_store", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(badResponse(500))
      .mockResolvedValueOnce(okResponse(USERS));
    const { container, store } = renderApp();
    await waitFor(() => expect(q(container, "#error")).toBeInTheDocument());

    fireEvent.click(q(container, "#reloadBtn"));
    expect(store.getState().loading).toBe(true);
    expect(q(container, "#error")).not.toBeInTheDocument();

    await waitForList(container);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(store.getState().error).toBeNull();
    expect(store.getState().users).toEqual(USERS);
  });
});
