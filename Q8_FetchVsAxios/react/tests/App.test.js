import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import App from "../App";
import { getWithFetch, getWithAxios } from "../api/client";

jest.mock("axios");

const TODO_URL = "https://jsonplaceholder.typicode.com/todos/1";
const TODO = { id: 1, title: "delectus aut autem", completed: false };

const okResponse = (data) => ({ ok: true, status: 200, json: () => Promise.resolve(data) });
const badResponse = (status) => ({ ok: false, status, json: () => Promise.resolve({}) });

const q = (container, selector) => container.querySelector(selector);
const text = (container, selector) => q(container, selector).textContent;
const click = (container, selector) => fireEvent.click(q(container, selector));
const waitForResult = (container) =>
  waitFor(() => expect(q(container, "#result")).toBeInTheDocument());
const waitForError = (container) =>
  waitFor(() => expect(q(container, "#error")).toBeInTheDocument());

afterEach(() => {
  delete global.fetch;
});

describe("Fetch vs Axios App", () => {
  test("verify_get_with_fetch_returns_the_parsed_json", async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse(TODO));
    await expect(getWithFetch(TODO_URL)).resolves.toEqual(TODO);
    expect(global.fetch).toHaveBeenCalledWith(TODO_URL);
  });

  test("verify_get_with_fetch_turns_a_bad_status_into_an_error", async () => {
    global.fetch = jest.fn().mockResolvedValue(badResponse(404));
    await expect(getWithFetch(TODO_URL)).rejects.toThrow("Request failed with status 404");
  });

  test("verify_get_with_fetch_labels_network_failures", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Failed to fetch"));
    await expect(getWithFetch(TODO_URL)).rejects.toThrow("Network error: Failed to fetch");
  });

  test("verify_get_with_axios_returns_response_data", async () => {
    axios.get.mockResolvedValue({ data: TODO });
    await expect(getWithAxios(TODO_URL)).resolves.toEqual(TODO);
    expect(axios.get).toHaveBeenCalledWith(TODO_URL);
  });

  test("verify_get_with_axios_gives_the_same_message_for_a_bad_status", async () => {
    axios.get.mockRejectedValue({
      response: { status: 500 },
      message: "Request failed with status code 500",
    });
    await expect(getWithAxios(TODO_URL)).rejects.toThrow("Request failed with status 500");
  });

  test("verify_get_with_axios_labels_network_failures", async () => {
    axios.get.mockRejectedValue(new Error("Network Error"));
    await expect(getWithAxios(TODO_URL)).rejects.toThrow("Network error: Network Error");
  });

  test("verify_fetch_button_shows_loading_then_the_todo_and_the_last_client", async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse(TODO));
    const { container } = render(<App />);
    expect(q(container, "#lastClient")).not.toBeInTheDocument();

    click(container, "#fetchBtn");
    expect(text(container, "#loading")).toBe("Loading...");
    await waitForResult(container);

    expect(text(container, "#todoTitle")).toBe("Title: delectus aut autem");
    expect(text(container, "#todoStatus")).toBe("Completed: No");
    expect(text(container, "#lastClient")).toBe("Last client: Fetch");
    expect(q(container, "#loading")).not.toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(TODO_URL);
  });

  test("verify_axios_button_shows_the_todo_and_the_last_client", async () => {
    axios.get.mockResolvedValue({ data: { ...TODO, completed: true } });
    const { container } = render(<App />);
    click(container, "#axiosBtn");
    await waitForResult(container);

    expect(text(container, "#todoStatus")).toBe("Completed: Yes");
    expect(text(container, "#lastClient")).toBe("Last client: Axios");
    expect(axios.get).toHaveBeenCalledWith(TODO_URL);
  });

  test("verify_both_buttons_show_the_same_error_messages", async () => {
    // HTTP error: same text for both clients
    global.fetch = jest.fn().mockResolvedValue(badResponse(404));
    axios.get.mockRejectedValue({ response: { status: 404 }, message: "Request failed with status code 404" });
    const { container } = render(<App />);

    click(container, "#fetchBtn");
    await waitForError(container);
    const fetchMessage = text(container, "#error");
    expect(fetchMessage).toBe("Request failed with status 404");

    click(container, "#axiosBtn");
    await waitFor(() => expect(text(container, "#lastClient")).toBe("Last client: Axios"));
    await waitForError(container);
    expect(text(container, "#error")).toBe(fetchMessage);

    // Network error: each client keeps its own original message
    global.fetch = jest.fn().mockRejectedValue(new Error("Failed to fetch"));
    axios.get.mockRejectedValue(new Error("Network Error"));

    click(container, "#fetchBtn");
    await waitFor(() => expect(text(container, "#error")).toBe("Network error: Failed to fetch"));
    click(container, "#axiosBtn");
    await waitFor(() => expect(text(container, "#error")).toBe("Network error: Network Error"));
  });

  test("verify_request_counters_and_the_loading_state_of_the_buttons", async () => {
    let resolveFetch;
    global.fetch = jest
      .fn()
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      )
      .mockResolvedValue(okResponse(TODO));
    axios.get.mockResolvedValue({ data: TODO });
    const { container } = render(<App />);
    expect(text(container, "#fetchCount")).toBe("0");
    expect(text(container, "#axiosCount")).toBe("0");

    click(container, "#fetchBtn");
    expect(q(container, "#fetchBtn")).toBeDisabled();
    expect(q(container, "#axiosBtn")).toBeDisabled();
    expect(q(container, "#result")).not.toBeInTheDocument();
    expect(text(container, "#fetchCount")).toBe("1");

    await act(async () => {
      resolveFetch(okResponse(TODO));
    });
    await waitForResult(container);
    expect(q(container, "#fetchBtn")).toBeEnabled();

    click(container, "#axiosBtn");
    await waitForResult(container); // wait until the Axios request has finished
    expect(text(container, "#axiosCount")).toBe("1");

    click(container, "#fetchBtn");
    expect(text(container, "#fetchCount")).toBe("2");
    expect(q(container, "#result")).not.toBeInTheDocument(); // the old result is cleared at once
    await waitForResult(container);
  });
});
