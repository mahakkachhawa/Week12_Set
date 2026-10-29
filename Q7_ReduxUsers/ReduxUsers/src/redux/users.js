// ACTION TYPES: one for each step of the loading flow, plus one for selecting a user
export const FETCH_REQUEST = "users/fetchRequest";
export const FETCH_SUCCESS = "users/fetchSuccess";
export const FETCH_FAILURE = "users/fetchFailure";
export const SELECT_USER = "users/select";

// ACTION CREATORS
export const fetchUsersRequest = () => ({ type: FETCH_REQUEST });
export const fetchUsersSuccess = (users) => ({ type: FETCH_SUCCESS, payload: users });
export const fetchUsersFailure = (message) => ({ type: FETCH_FAILURE, payload: message });
export const selectUser = (id) => ({ type: SELECT_USER, payload: id });

const initialState = { loading: false, error: null, users: [], selectedId: null };

// REDUCER
function usersReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        users: action.payload,
        // keep the selection only if that user is still in the new list
        selectedId: action.payload.some((user) => user.id === state.selectedId)
          ? state.selectedId
          : null,
      };

    case FETCH_FAILURE:
      return { ...state, loading: false, error: action.payload }; // users are kept

    case SELECT_USER:
      return { ...state, selectedId: action.payload };

    default:
      return state;
  }
}

export default usersReducer;
