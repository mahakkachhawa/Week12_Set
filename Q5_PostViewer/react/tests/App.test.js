import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import App from "../App";

jest.mock("axios");

const POSTS_URL = "https://jsonplaceholder.typicode.com/posts";
const POSTS = [
  { id: 1, userId: 1, title: "First post" },
  { id: 2, userId: 1, title: "Second post" },
];

const q = (container, selector) => container.querySelector(selector);
const text = (container, selector) => q(container, selector).textContent;
const click = (container, selector) => fireEvent.click(q(container, selector));
const typeId = (container, value) =>
  fireEvent.change(q(container, "#userIdInput"), { target: { value } });
const titles = (container) =>
  Array.from(container.querySelectorAll("#postList li")).map((li) => li.textContent);

describe("Post Viewer App (Axios GET)", () => {
  test("verify_no_request_is_sent_before_the_button_is_clicked", () => {
    axios.get.mockResolvedValue({ data: POSTS });
    const { container } = render(<App />);
    expect(axios.get).not.toHaveBeenCalled();
    expect(q(container, "#postList")).not.toBeInTheDocument();
  });

  test("verify_click_sends_axios_get_with_the_url_and_params_object", async () => {
    axios.get.mockResolvedValue({ data: POSTS });
    const { container } = render(<App />);
    click(container, "#loadBtn");
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(POSTS_URL, { params: { userId: 1 } });
    await waitFor(() => expect(q(container, "#postList")).toBeInTheDocument());
  });

  test("verify_the_typed_user_id_is_sent_as_a_number", async () => {
    axios.get.mockResolvedValue({ data: POSTS });
    const { container } = render(<App />);
    typeId(container, "5");
    click(container, "#loadBtn");
    expect(axios.get).toHaveBeenCalledWith(POSTS_URL, { params: { userId: 5 } });
    await waitFor(() => expect(q(container, "#postList")).toBeInTheDocument());
  });

  test("verify_invalid_user_ids_show_an_error_and_send_no_request", () => {
    axios.get.mockResolvedValue({ data: POSTS });
    const { container } = render(<App />);
    ["0", "-2", "", "2.5"].forEach((value) => {
      typeId(container, value);
      click(container, "#loadBtn");
      expect(text(container, "#inputError")).toBe("Enter a valid user id");
    });
    expect(axios.get).not.toHaveBeenCalled();
  });

  test("verify_loading_text_is_shown_and_the_button_is_disabled_while_waiting", async () => {
    let resolveRequest;
    axios.get.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    const { container } = render(<App />);
    click(container, "#loadBtn");

    expect(text(container, "#loading")).toBe("Loading posts...");
    expect(q(container, "#loadBtn")).toBeDisabled();

    await act(async () => {
      resolveRequest({ data: POSTS });
    });
    await waitFor(() => expect(q(container, "#postList")).toBeInTheDocument());
    expect(q(container, "#loading")).not.toBeInTheDocument();
    expect(q(container, "#loadBtn")).toBeEnabled();
  });

  test("verify_posts_are_listed_from_response_data_with_a_count", async () => {
    axios.get.mockResolvedValue({ data: POSTS });
    const { container } = render(<App />);
    click(container, "#loadBtn");
    await waitFor(() => expect(q(container, "#postList")).toBeInTheDocument());
    expect(titles(container)).toEqual(["First post", "Second post"]);
    expect(text(container, "#postCount")).toBe("Posts: 2");
  });

  test("verify_empty_result_shows_a_message", async () => {
    axios.get.mockResolvedValue({ data: [] });
    const { container } = render(<App />);
    click(container, "#loadBtn");
    await waitFor(() => expect(q(container, "#emptyMessage")).toBeInTheDocument());
    expect(text(container, "#emptyMessage")).toBe("No posts for this user");
    expect(q(container, "#postCount")).not.toBeInTheDocument();
    expect(q(container, "#postList")).not.toBeInTheDocument();
  });

  test("verify_server_error_uses_the_response_status", async () => {
    axios.get.mockRejectedValue({ response: { status: 404 }, message: "Request failed with status code 404" });
    const { container } = render(<App />);
    click(container, "#loadBtn");
    await waitFor(() => expect(q(container, "#error")).toBeInTheDocument());
    expect(text(container, "#error")).toBe("Server error: 404");
    expect(q(container, "#loading")).not.toBeInTheDocument();
    expect(q(container, "#postList")).not.toBeInTheDocument();
  });

  test("verify_network_error_uses_the_error_message", async () => {
    axios.get.mockRejectedValue(new Error("Network Error"));
    const { container } = render(<App />);
    click(container, "#loadBtn");
    await waitFor(() => expect(q(container, "#error")).toBeInTheDocument());
    expect(text(container, "#error")).toBe("Network error: Network Error");
  });

  test("verify_a_failed_request_clears_the_old_list_and_a_new_success_clears_the_error", async () => {
    axios.get
      .mockResolvedValueOnce({ data: POSTS })
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockResolvedValueOnce({ data: [POSTS[0]] });
    const { container } = render(<App />);

    click(container, "#loadBtn");
    await waitFor(() => expect(titles(container).length).toBe(2));

    click(container, "#loadBtn");
    await waitFor(() => expect(q(container, "#error")).toBeInTheDocument());
    expect(q(container, "#postList")).not.toBeInTheDocument();

    click(container, "#loadBtn");
    await waitFor(() => expect(titles(container)).toEqual(["First post"]));
    expect(q(container, "#error")).not.toBeInTheDocument();
    expect(text(container, "#postCount")).toBe("Posts: 1");
  });
});
