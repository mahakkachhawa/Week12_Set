import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";

const POSTS_URL = "https://jsonplaceholder.typicode.com/posts";

const okResponse = (data) => ({ ok: true, status: 201, json: () => Promise.resolve(data) });
const badResponse = (status) => ({ ok: false, status, json: () => Promise.resolve({}) });

const q = (container, selector) => container.querySelector(selector);
const text = (container, selector) => q(container, selector).textContent;
const click = (container, selector) => fireEvent.click(q(container, selector));
const fill = (container, title, body) => {
  fireEvent.change(q(container, "#titleInput"), { target: { value: title } });
  fireEvent.change(q(container, "#bodyInput"), { target: { value: body } });
};

afterEach(() => {
  delete global.fetch;
});

describe("New Post Form App (fetch POST)", () => {
  test("verify_empty_form_shows_both_errors_and_sends_no_request", () => {
    global.fetch = jest.fn();
    const { container } = render(<App />);
    click(container, "#submitBtn");
    expect(text(container, "#titleError")).toBe("Title is required");
    expect(text(container, "#bodyError")).toBe("Body is required");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("verify_only_the_missing_field_shows_an_error", () => {
    global.fetch = jest.fn();
    const { container } = render(<App />);

    fill(container, "   ", "Some body");
    click(container, "#submitBtn");
    expect(text(container, "#titleError")).toBe("Title is required");
    expect(q(container, "#bodyError")).not.toBeInTheDocument();

    fill(container, "Some title", "   ");
    click(container, "#submitBtn");
    expect(q(container, "#titleError")).not.toBeInTheDocument();
    expect(text(container, "#bodyError")).toBe("Body is required");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("verify_post_request_has_the_url_method_headers_and_json_body", async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse({ id: 101 }));
    const { container } = render(<App />);
    fill(container, "  Hello  ", " World ");
    click(container, "#submitBtn");

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe(POSTS_URL);
    expect(options.method).toBe("POST");
    expect(options.headers).toEqual({ "Content-Type": "application/json" });
    expect(typeof options.body).toBe("string");
    expect(JSON.parse(options.body)).toEqual({ title: "Hello", body: "World", userId: 1 });
    await waitFor(() => expect(q(container, "#success")).toBeInTheDocument());
  });

  test("verify_saving_text_is_shown_and_the_button_is_disabled_while_waiting", async () => {
    let resolveRequest;
    global.fetch = jest.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    const { container } = render(<App />);
    fill(container, "Hello", "World");
    click(container, "#submitBtn");

    expect(text(container, "#saving")).toBe("Saving...");
    expect(q(container, "#submitBtn")).toBeDisabled();

    await act(async () => {
      resolveRequest(okResponse({ id: 101 }));
    });
    await waitFor(() => expect(q(container, "#saving")).not.toBeInTheDocument());
    expect(q(container, "#submitBtn")).toBeEnabled();
  });

  test("verify_success_shows_the_new_id_and_clears_the_form", async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse({ id: 101 }));
    const { container } = render(<App />);
    fill(container, "Hello", "World");
    click(container, "#submitBtn");

    await waitFor(() => expect(q(container, "#success")).toBeInTheDocument());
    expect(text(container, "#success")).toBe("Post created with id 101");
    expect(q(container, "#titleInput").value).toBe("");
    expect(q(container, "#bodyInput").value).toBe("");
    expect(q(container, "#error")).not.toBeInTheDocument();
  });

  test("verify_error_status_shows_the_status_and_keeps_the_typed_values", async () => {
    global.fetch = jest.fn().mockResolvedValue(badResponse(500));
    const { container } = render(<App />);
    fill(container, "Hello", "World");
    click(container, "#submitBtn");

    await waitFor(() => expect(q(container, "#error")).toBeInTheDocument());
    expect(text(container, "#error")).toBe("Failed to create post (status 500)");
    expect(q(container, "#titleInput").value).toBe("Hello");
    expect(q(container, "#bodyInput").value).toBe("World");
    expect(q(container, "#success")).not.toBeInTheDocument();
  });

  test("verify_network_failure_shows_the_message_and_keeps_the_typed_values", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Failed to fetch"));
    const { container } = render(<App />);
    fill(container, "Hello", "World");
    click(container, "#submitBtn");

    await waitFor(() => expect(q(container, "#error")).toBeInTheDocument());
    expect(text(container, "#error")).toBe("Network error: Failed to fetch");
    expect(q(container, "#titleInput").value).toBe("Hello");
    expect(q(container, "#submitBtn")).toBeEnabled();
  });

  test("verify_old_messages_are_cleared_when_a_new_submit_starts", async () => {
    let resolveSecond;
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(badResponse(500))
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecond = resolve;
        })
      );
    const { container } = render(<App />);
    fill(container, "Hello", "World");
    click(container, "#submitBtn");
    await waitFor(() => expect(q(container, "#error")).toBeInTheDocument());

    click(container, "#submitBtn"); // second attempt, still pending
    expect(q(container, "#error")).not.toBeInTheDocument();
    expect(text(container, "#saving")).toBe("Saving...");

    await act(async () => {
      resolveSecond(okResponse({ id: 7 }));
    });
    await waitFor(() => expect(text(container, "#success")).toBe("Post created with id 7"));
  });

  test("verify_field_errors_disappear_when_the_user_types", () => {
    global.fetch = jest.fn();
    const { container } = render(<App />);
    click(container, "#submitBtn");
    expect(q(container, "#titleError")).toBeInTheDocument();
    expect(q(container, "#bodyError")).toBeInTheDocument();

    fireEvent.change(q(container, "#titleInput"), { target: { value: "H" } });
    expect(q(container, "#titleError")).not.toBeInTheDocument();
    expect(q(container, "#bodyError")).toBeInTheDocument();

    fireEvent.change(q(container, "#bodyInput"), { target: { value: "W" } });
    expect(q(container, "#bodyError")).not.toBeInTheDocument();
  });

  test("verify_a_second_click_while_saving_does_not_send_another_request", async () => {
    let resolveRequest;
    global.fetch = jest.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    const { container } = render(<App />);
    fill(container, "Hello", "World");
    click(container, "#submitBtn");
    click(container, "#submitBtn");
    click(container, "#submitBtn");
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRequest(okResponse({ id: 101 }));
    });
    await waitFor(() => expect(q(container, "#success")).toBeInTheDocument());
  });
});
