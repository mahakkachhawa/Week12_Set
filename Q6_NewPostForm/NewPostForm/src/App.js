import React, { useState } from "react";

const POSTS_URL = "https://jsonplaceholder.typicode.com/posts";

function App() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [titleError, setTitleError] = useState("");
  const [bodyError, setBodyError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleTitleChange = (event) => {
    setTitle(event.target.value);
    setTitleError("");
  };

  const handleBodyChange = (event) => {
    setBody(event.target.value);
    setBodyError("");
  };

  const handleSubmit = async () => {
    if (saving) return; // no double submit

    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    const newTitleError = cleanTitle === "" ? "Title is required" : "";
    const newBodyError = cleanBody === "" ? "Body is required" : "";
    setTitleError(newTitleError);
    setBodyError(newBodyError);
    if (newTitleError || newBodyError) return; // invalid form: no request

    setSaving(true);
    setSuccess("");
    setError("");

    try {
      // fetch POST: method, headers and a JSON string body are all written by hand
      const response = await fetch(POSTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cleanTitle, body: cleanBody, userId: 1 }),
      });

      if (!response.ok) {
        setError(`Failed to create post (status ${response.status})`);
      } else {
        const created = await response.json();
        setSuccess(`Post created with id ${created.id}`);
        setTitle("");
        setBody("");
      }
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app">
      <h1 id="title">New Post Form</h1>

      <div>
        <input
          id="titleInput"
          type="text"
          placeholder="Title"
          value={title}
          onChange={handleTitleChange}
        />
        {titleError && <p id="titleError" className="error">{titleError}</p>}
      </div>

      <div>
        <textarea
          id="bodyInput"
          rows="4"
          placeholder="Body"
          value={body}
          onChange={handleBodyChange}
        />
        {bodyError && <p id="bodyError" className="error">{bodyError}</p>}
      </div>

      <button id="submitBtn" disabled={saving} onClick={handleSubmit}>Create Post</button>

      {saving && <p id="saving">Saving...</p>}
      {success && <p id="success" className="success">{success}</p>}
      {error && <p id="error" className="error">{error}</p>}
    </div>
  );
}

export default App;
