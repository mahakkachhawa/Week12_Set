import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { legacy_createStore as createStore } from "redux";
import "@testing-library/jest-dom";
import axios from "axios";
import notesReducer, {
  loadRequest,
  loadSuccess,
  loadFailure,
  saveRequest,
  saveSuccess,
  saveFailure,
  LOAD_REQUEST,
  LOAD_SUCCESS,
  LOAD_FAILURE,
  SAVE_REQUEST,
  SAVE_SUCCESS,
  SAVE_FAILURE,
} from "../redux/notes";
import App from "../App";

jest.mock("axios");

const NOTES_URL = "https://api.example.com/notes";
const NOTES = [
  { id: 1, text: "First note" },
  { id: 2, text: "Second note" },
];
const START = { type: "@@TEST_INIT" };
const INITIAL = { notes: [], loading: false, saving: false, error: null };

const deepFreeze = (value) => {
  Object.freeze(value);
  Object.values(value).forEach((inner) => {
    if (typeof inner === "object" && inner !== null && !Object.isFrozen(inner)) deepFreeze(inner);
  });
  return value;
};

const renderApp = () => {
  const store = createStore(notesReducer);
  const utils = render(
    <Provider store={store}>
      <App />
    </Provider>
  );
  return { store, ...utils };
};

const q = (container, selector) => container.querySelector(selector);
const text = (container, selector) => q(container, selector).textContent;
const noteTexts = (container) =>
  Array.from(container.querySelectorAll("#noteList li")).map((li) => li.textContent);
const waitForNotes = (container, count) =>
  waitFor(() => expect(noteTexts(container).length).toBe(count));
const typeNote = (container, value) =>
  fireEvent.change(q(container, "#noteInput"), { target: { value } });

describe("Notes Board App (Redux + Axios GET and POST)", () => {
  test("verify_initial_state_action_creators_and_load_transitions", () => {
    expect(notesReducer(undefined, START)).toEqual(INITIAL);
    expect([LOAD_REQUEST, LOAD_SUCCESS, LOAD_FAILURE, SAVE_REQUEST, SAVE_SUCCESS, SAVE_FAILURE]).toEqual([
      "notes/loadRequest",
      "notes/loadSuccess",
      "notes/loadFailure",
      "notes/saveRequest",
      "notes/saveSuccess",
      "notes/saveFailure",
    ]);
    expect(loadRequest()).toEqual({ type: "notes/loadRequest" });
    expect(loadSuccess(NOTES)).toEqual({ type: "notes/loadSuccess", payload: NOTES });
    expect(loadFailure("x")).toEqual({ type: "notes/loadFailure", payload: "x" });
    expect(saveRequest()).toEqual({ type: "notes/saveRequest" });
    expect(saveSuccess(NOTES[0])).toEqual({ type: "notes/saveSuccess", payload: NOTES[0] });
    expect(saveFailure("y")).toEqual({ type: "notes/saveFailure", payload: "y" });

    const loading = notesReducer({ ...INITIAL, error: "old" }, loadRequest());
    expect(loading).toEqual({ notes: [], loading: true, saving: false, error: null });
    expect(notesReducer(loading, loadSuccess(NOTES))).toEqual({
      notes: NOTES,
      loading: false,
      saving: false,
      error: null,
    });
    expect(notesReducer(loading, loadFailure("Server error: 404"))).toEqual({
      notes: [],
      loading: false,
      saving: false,
      error: "Server error: 404",
    });
  });

  test("verify_save_transitions_append_the_note_and_keep_notes_on_failure", () => {
    const loaded = notesReducer(undefined, loadSuccess(NOTES));
    const saving = notesReducer({ ...loaded, error: "old" }, saveRequest());
    expect(saving.saving).toBe(true);
    expect(saving.error).toBeNull();

    const saved = notesReducer(saving, saveSuccess({ id: 3, text: "Third" }));
    expect(saved.saving).toBe(false);
    expect(saved.notes.map((note) => note.id)).toEqual([1, 2, 3]);

    const failed = notesReducer(notesReducer(loaded, saveRequest()), saveFailure("Network error: x"));
    expect(failed.saving).toBe(false);
    expect(failed.error).toBe("Network error: x");
    expect(failed.notes).toEqual(NOTES);
  });

  test("verify_reducer_never_mutates_the_previous_state", () => {
    const previous = deepFreeze({ notes: [...NOTES], loading: false, saving: false, error: "e" });
    [
      loadRequest(),
      loadSuccess([]),
      loadFailure("f"),
      saveRequest(),
      saveSuccess({ id: 9, text: "n" }),
      saveFailure("f"),
    ].forEach((action) => {
      const next = notesReducer(previous, action); // throws if a frozen object is changed
      expect(next).not.toBe(previous);
    });
    expect(notesReducer(previous, { type: "UNKNOWN" })).toBe(previous);
  });

  test("verify_notes_are_requested_once_with_get_and_shown_after_loading", async () => {
    let resolveGet;
    axios.get.mockReturnValue(
      new Promise((resolve) => {
        resolveGet = resolve;
      })
    );
    const { container, store } = renderApp();

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(NOTES_URL);
    expect(text(container, "#loading")).toBe("Loading notes...");

    await act(async () => {
      resolveGet({ data: NOTES });
    });
    await waitForNotes(container, 2);
    expect(noteTexts(container)).toEqual(["First note", "Second note"]);
    expect(q(container, "#loading")).not.toBeInTheDocument();
    expect(store.getState().notes).toEqual(NOTES);
  });

  test("verify_load_failures_show_the_server_status_or_the_network_message", async () => {
    axios.get.mockRejectedValueOnce({ response: { status: 404 } });
    let view = renderApp();
    await waitFor(() => expect(q(view.container, "#error")).toBeInTheDocument());
    expect(text(view.container, "#error")).toBe("Server error: 404");
    expect(q(view.container, "#loading")).not.toBeInTheDocument();
    expect(view.store.getState().loading).toBe(false);
    view.unmount();

    axios.get.mockRejectedValueOnce(new Error("Network Error"));
    view = renderApp();
    await waitFor(() => expect(q(view.container, "#error")).toBeInTheDocument());
    expect(text(view.container, "#error")).toBe("Network error: Network Error");
  });

  test("verify_adding_a_note_sends_post_shows_saving_and_adds_the_server_note", async () => {
    axios.get.mockResolvedValue({ data: NOTES });
    let resolvePost;
    axios.post.mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve;
      })
    );
    const { container, store } = renderApp();
    await waitForNotes(container, 2);

    typeNote(container, "  Buy milk  ");
    fireEvent.click(q(container, "#addNoteBtn"));

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(NOTES_URL, { text: "Buy milk" });
    expect(text(container, "#addNoteBtn")).toBe("Saving...");
    expect(q(container, "#addNoteBtn")).toBeDisabled();

    await act(async () => {
      resolvePost({ data: { id: 99, text: "Buy milk" } });
    });
    await waitForNotes(container, 3);
    expect(noteTexts(container)[2]).toBe("Buy milk");
    expect(q(container, "#noteInput").value).toBe("");
    expect(text(container, "#addNoteBtn")).toBe("Add Note");
    expect(q(container, "#addNoteBtn")).toBeEnabled();
    expect(store.getState().notes[2]).toEqual({ id: 99, text: "Buy milk" });
  });

  test("verify_blank_note_shows_an_error_and_sends_no_request", async () => {
    axios.get.mockResolvedValue({ data: NOTES });
    const { container } = renderApp();
    await waitForNotes(container, 2);

    typeNote(container, "   ");
    fireEvent.click(q(container, "#addNoteBtn"));
    expect(text(container, "#noteError")).toBe("Note cannot be empty");
    expect(axios.post).not.toHaveBeenCalled();

    typeNote(container, "a");
    expect(q(container, "#noteError")).not.toBeInTheDocument();
  });

  test("verify_failed_post_shows_the_error_keeps_the_input_and_the_notes", async () => {
    axios.get.mockResolvedValue({ data: NOTES });
    axios.post.mockRejectedValue({ response: { status: 500 } });
    const { container, store } = renderApp();
    await waitForNotes(container, 2);

    typeNote(container, "Buy milk");
    fireEvent.click(q(container, "#addNoteBtn"));
    await waitFor(() => expect(q(container, "#error")).toBeInTheDocument());

    expect(text(container, "#error")).toBe("Server error: 500");
    expect(q(container, "#noteInput").value).toBe("Buy milk");
    expect(q(container, "#addNoteBtn")).toBeEnabled();
    expect(noteTexts(container).length).toBe(2);
    expect(store.getState().saving).toBe(false);
  });

  test("verify_note_count_follows_the_store", async () => {
    axios.get.mockResolvedValue({ data: NOTES });
    axios.post.mockResolvedValue({ data: { id: 3, text: "Third" } });
    const { container } = renderApp();
    await waitFor(() => expect(text(container, "#noteCount")).toBe("Notes: 2"));

    typeNote(container, "Third");
    fireEvent.click(q(container, "#addNoteBtn"));
    await waitFor(() => expect(text(container, "#noteCount")).toBe("Notes: 3"));
  });

  test("verify_a_new_save_clears_the_previous_error", async () => {
    axios.get.mockResolvedValue({ data: NOTES });
    axios.post
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce({ data: { id: 3, text: "Retry" } });
    const { container } = renderApp();
    await waitForNotes(container, 2);

    typeNote(container, "Retry");
    fireEvent.click(q(container, "#addNoteBtn"));
    await waitFor(() => expect(q(container, "#error")).toBeInTheDocument());
    expect(text(container, "#error")).toBe("Network error: Network Error");

    fireEvent.click(q(container, "#addNoteBtn"));
    expect(q(container, "#error")).not.toBeInTheDocument();
    await waitForNotes(container, 3);
    expect(q(container, "#error")).not.toBeInTheDocument();
  });
});
