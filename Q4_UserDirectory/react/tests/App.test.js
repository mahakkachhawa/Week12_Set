import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";

const USERS_URL = "https://jsonplaceholder.typicode.com/users";
const USERS = [
  { id: 1, name: "Leanne Graham", email: "leanne@mail.com" },
  { id: 2, name: "Ervin Howell", email: "ervin@mail.com" },
  { id: 3, name: "Clementine Bauch", email: "clem@mail.com" },
];

const okResponse = (data) => ({ ok: true, status: 200, json: () => Promise.resolve(data) });
const badResponse = (status) => ({ ok: false, status, json: () => Promise.resolve({}) });

const deferred = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const q = (container, selector) => container.querySelector(selector);
const text = (container, selector) => q(container, selector).textContent;
const names = (container) =>
  Array.from(container.querySelectorAll("#userList li")).map((li) => li.textContent);
const waitForList = (container) =>
  waitFor(() => expect(q(container, "#userList")).toBeInTheDocument());

afterEach(() => {
  delete global.fetch;
});

describe("User Directory App (fetch GET)", () => {
  test("verify_users_are_requested_once_on_mount_with_the_users_url", async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse(USERS));
    const { container } = render(<App />);
    await waitForList(container);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(USERS_URL);
  });

  test("verify_loading_text_is_shown_while_the_request_is_pending", async () => {
    const pending = deferred();
    global.fetch = jest.fn().mockReturnValue(pending.promise);
    const { container } = render(<App />);

    expect(text(container, "#loading")).toBe("Loading users...");
    expect(q(container, "#userList")).not.toBeInTheDocument();
    expect(q(container, "#error")).not.toBeInTheDocument();

    await act(async () => {
      pending.resolve(okResponse(USERS));
    });
    await waitForList(container);
    expect(q(container, "#loading")).not.toBeInTheDocument();
  });

  test("verify_every_user_is_listed_with_name_and_email", async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse(USERS));
    const { container } = render(<App />);
    await waitForList(container);
    expect(names(container)).toEqual([
      "Leanne Graham (leanne@mail.com)",
      "Ervin Howell (ervin@mail.com)",
      "Clementine Bauch (clem@mail.com)",
    ]);
  });

  test("verify_user_count_text_shows_visible_and_total_users", async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse(USERS));
    const { container } = render(<App />);
    await waitForList(container);
    expect(text(container, "#userCount")).toBe("Showing 3 of 3 users");
  });

  test("verify_empty_result_shows_a_message_and_no_search_box", async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse([]));
    const { container } = render(<App />);
    await waitFor(() => expect(q(container, "#emptyMessage")).toBeInTheDocument());
    expect(text(container, "#emptyMessage")).toBe("No users found");
    expect(q(container, "#userList")).not.toBeInTheDocument();
    expect(q(container, "#searchInput")).not.toBeInTheDocument();
  });

  test("verify_error_status_response_shows_the_status_code", async () => {
    global.fetch = jest.fn().mockResolvedValue(badResponse(500));
    const { container } = render(<App />);
    await waitFor(() => expect(q(container, "#error")).toBeInTheDocument());
    expect(text(container, "#error")).toBe("Failed to load users (status 500)");
    expect(q(container, "#loading")).not.toBeInTheDocument();
    expect(q(container, "#userList")).not.toBeInTheDocument();
    expect(q(container, "#retryBtn")).toBeInTheDocument();
  });

  test("verify_network_failure_shows_the_error_message", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Failed to fetch"));
    const { container } = render(<App />);
    await waitFor(() => expect(q(container, "#error")).toBeInTheDocument());
    expect(text(container, "#error")).toBe("Network error: Failed to fetch");
    expect(q(container, "#loading")).not.toBeInTheDocument();
  });

  test("verify_retry_button_requests_again_and_clears_the_error", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(badResponse(404))
      .mockResolvedValueOnce(okResponse(USERS));
    const { container } = render(<App />);
    await waitFor(() => expect(q(container, "#error")).toBeInTheDocument());

    fireEvent.click(q(container, "#retryBtn"));
    expect(text(container, "#loading")).toBe("Loading users...");
    expect(q(container, "#error")).not.toBeInTheDocument();

    await waitForList(container);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(q(container, "#retryBtn")).not.toBeInTheDocument();
    expect(names(container).length).toBe(3);
  });

  test("verify_search_filters_by_name_ignoring_case_and_spaces", async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse(USERS));
    const { container } = render(<App />);
    await waitForList(container);

    fireEvent.change(q(container, "#searchInput"), { target: { value: "ervin" } });
    expect(names(container)).toEqual(["Ervin Howell (ervin@mail.com)"]);
    expect(text(container, "#userCount")).toBe("Showing 1 of 3 users");

    fireEvent.change(q(container, "#searchInput"), { target: { value: "  CLEM " } });
    expect(names(container)).toEqual(["Clementine Bauch (clem@mail.com)"]);

    fireEvent.change(q(container, "#searchInput"), { target: { value: "zzz" } });
    expect(text(container, "#noMatch")).toBe("No matching users");
    expect(q(container, "#userList")).not.toBeInTheDocument();
    expect(text(container, "#userCount")).toBe("Showing 0 of 3 users");

    fireEvent.change(q(container, "#searchInput"), { target: { value: "" } });
    expect(names(container).length).toBe(3);
  });

  test("verify_typing_in_the_search_box_does_not_send_a_new_request", async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse(USERS));
    const { container } = render(<App />);
    await waitForList(container);
    fireEvent.change(q(container, "#searchInput"), { target: { value: "a" } });
    fireEvent.change(q(container, "#searchInput"), { target: { value: "ab" } });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
