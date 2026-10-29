import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { saveRequest, saveSuccess, saveFailure } from "../redux/notes";

const NOTES_URL = "https://api.example.com/notes";

const toMessage = (err) =>
  err.response ? `Server error: ${err.response.status}` : `Network error: ${err.message}`;

function NoteForm() {
  const dispatch = useDispatch();
  const saving = useSelector((state) => state.saving);
  const [text, setText] = useState("");
  const [inputError, setInputError] = useState("");

  const handleChange = (event) => {
    setText(event.target.value);
    setInputError("");
  };

  const handleAdd = async () => {
    if (saving) return;

    const clean = text.trim();
    if (clean === "") {
      setInputError("Note cannot be empty"); // no request for an empty note
      return;
    }

    setInputError("");
    dispatch(saveRequest());

    try {
      // POST: the second argument of axios.post is the body (Axios converts it to JSON)
      const response = await axios.post(NOTES_URL, { text: clean });
      dispatch(saveSuccess(response.data)); // the server returns the saved note with its id
      setText("");
    } catch (err) {
      dispatch(saveFailure(toMessage(err)));
    }
  };

  return (
    <div>
      <input
        id="noteInput"
        type="text"
        placeholder="Write a note"
        value={text}
        onChange={handleChange}
      />
      <button id="addNoteBtn" disabled={saving} onClick={handleAdd}>
        {saving ? "Saving..." : "Add Note"}
      </button>
      {inputError && <p id="noteError" className="error">{inputError}</p>}
    </div>
  );
}

export default NoteForm;
