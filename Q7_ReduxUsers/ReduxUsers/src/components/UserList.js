import React, { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchUsersRequest,
  fetchUsersSuccess,
  fetchUsersFailure,
  selectUser,
} from "../redux/users";

const USERS_URL = "https://jsonplaceholder.typicode.com/users";

function UserList() {
  const dispatch = useDispatch();
  const loading = useSelector((state) => state.loading);
  const error = useSelector((state) => state.error);
  const users = useSelector((state) => state.users);
  const selectedId = useSelector((state) => state.selectedId);

  // The component talks to the server and tells the store what happened
  const loadUsers = useCallback(async () => {
    dispatch(fetchUsersRequest());

    try {
      const response = await fetch(USERS_URL);
      if (!response.ok) {
        dispatch(fetchUsersFailure(`Failed to load users (status ${response.status})`));
        return;
      }
      const data = await response.json();
      dispatch(fetchUsersSuccess(data));
    } catch (err) {
      dispatch(fetchUsersFailure(`Network error: ${err.message}`));
    }
  }, [dispatch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const selectedUser = users.find((user) => user.id === selectedId) || null;

  return (
    <div>
      <button id="reloadBtn" disabled={loading} onClick={loadUsers}>Reload</button>

      {loading && <p id="loading">Loading users...</p>}
      {error && <p id="error" className="error">{error}</p>}

      {users.length > 0 && (
        <ul id="userList">
          {users.map((user) => (
            <li key={user.id} id={`user-${user.id}`}>
              {user.name}{" "}
              <button id={`view-${user.id}`} onClick={() => dispatch(selectUser(user.id))}>
                View
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedUser ? (
        <div id="userDetails" className="panel">
          <p id="detailName">{`Name: ${selectedUser.name}`}</p>
          <p id="detailEmail">{`Email: ${selectedUser.email}`}</p>
        </div>
      ) : (
        <p id="noSelection" className="muted">Select a user to see details</p>
      )}
    </div>
  );
}

export default UserList;
