import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import NoteForm from "./components/NoteForm";
import { loadRequest, loadSuccess, loadFailure } from "./redux/notes";

const NOTES_URL = "https://api.example.com/notes";

const toMessage = (err) =>
  err.response ? `Server error: ${err.response.status}` : `Network error: ${err.message}`;

function App() {
  const dispatch = useDispatch();
  const notes = useSelector((state) => state.notes);
  const loading = useSelector((state) => state.loading);
  const error = useSelector((state) => state.error);

  // GET the notes once, when the app opens
  useEffect(() => {
    const loadNotes = async () => {
      dispatch(loadRequest());
      try {
        const response = await axios.get(NOTES_URL);
        dispatch(loadSuccess(response.data));
      } catch (err) {
        dispatch(loadFailure(toMessage(err)));
      }
    };
    loadNotes();
  }, [dispatch]);

  return (
    <div className="app">
      <h1 id="title">Notes Board</h1>

      <NoteForm />

      {loading && <p id="loading">Loading notes...</p>}
      {error && <p id="error" className="error">{error}</p>}

      <p id="noteCount">{`Notes: ${notes.length}`}</p>
      <ul id="noteList">
        {notes.map((note) => (
          <li key={note.id}>{note.text}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
