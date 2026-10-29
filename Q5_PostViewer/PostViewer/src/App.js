import React, { useState } from "react";
import axios from "axios";

const POSTS_URL = "https://jsonplaceholder.typicode.com/posts";

function App() {
  const [userId, setUserId] = useState("1");
  const [posts, setPosts] = useState([]);
  const [loaded, setLoaded] = useState(false); // true after a successful request
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inputError, setInputError] = useState("");

  const handleLoad = async () => {
    const id = Number(userId);

    // Validate first: an invalid id never sends a request
    if (userId.trim() === "" || !Number.isInteger(id) || id < 1) {
      setInputError("Enter a valid user id");
      return;
    }

    setInputError("");
    setError("");
    setLoading(true);

    try {
      // Axios: query parameters go in the "params" object and the JSON is in response.data
      const response = await axios.get(POSTS_URL, { params: { userId: id } });
      setPosts(response.data);
      setLoaded(true);
    } catch (err) {
      setPosts([]);
      setLoaded(false);
      // Axios THROWS for 404 and 500: err.response exists only when the server answered
      setError(err.response ? `Server error: ${err.response.status}` : `Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <h1 id="title">Post Viewer</h1>

      <input
        id="userIdInput"
        type="number"
        value={userId}
        onChange={(event) => setUserId(event.target.value)}
      />
      <button id="loadBtn" disabled={loading} onClick={handleLoad}>Load Posts</button>

      {inputError && <p id="inputError" className="error">{inputError}</p>}
      {loading && <p id="loading">Loading posts...</p>}
      {error && <p id="error" className="error">{error}</p>}

      {loaded && posts.length === 0 && (
        <p id="emptyMessage" className="muted">No posts for this user</p>
      )}

      {loaded && posts.length > 0 && (
        <div>
          <p id="postCount">{`Posts: ${posts.length}`}</p>
          <ul id="postList">
            {posts.map((post) => (
              <li key={post.id}>{post.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
