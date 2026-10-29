import React, { useCallback, useEffect, useState } from "react";

const USERS_URL = "https://jsonplaceholder.typicode.com/users";

function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(USERS_URL);

      // fetch does NOT throw for 404 or 500: the "ok" flag must be checked by hand
      if (!response.ok) {
        setUsers([]);
        setError(`Failed to load users (status ${response.status})`);
        return;
      }

      const data = await response.json(); // with fetch, the JSON must be read explicitly
      setUsers(data);
    } catch (err) {
      // fetch only rejects for network problems
      setUsers([]);
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const term = search.trim().toLowerCase();
  const visibleUsers = users.filter((user) => user.name.toLowerCase().includes(term));

  return (
    <div className="app">
      <h1 id="title">User Directory</h1>

      {loading && <p id="loading">Loading users...</p>}

      {error && (
        <div>
          <p id="error" className="error">{error}</p>
          <button id="retryBtn" onClick={loadUsers}>Retry</button>
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <p id="emptyMessage" className="muted">No users found</p>
      )}

      {!loading && !error && users.length > 0 && (
        <div>
          <input
            id="searchInput"
            type="text"
            placeholder="Search by name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <p id="userCount">{`Showing ${visibleUsers.length} of ${users.length} users`}</p>

          {visibleUsers.length === 0 ? (
            <p id="noMatch" className="muted">No matching users</p>
          ) : (
            <ul id="userList">
              {visibleUsers.map((user) => (
                <li key={user.id}>{`${user.name} (${user.email})`}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
