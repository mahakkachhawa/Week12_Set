import { legacy_createStore as createStore } from "redux";
import counterReducer from "./counter";

// The single store of the application
const store = createStore(counterReducer);

export default store;
