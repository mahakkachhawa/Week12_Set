import axios from "axios";

// Both functions do the same job and must give the SAME results and the SAME error messages.

// FETCH: it resolves even for 404 / 500, so "response.ok" must be checked by hand,
// and the JSON body must be read with response.json()
export async function getWithFetch(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`Network error: ${error.message}`);
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

// AXIOS: it rejects for 404 / 500 (error.response holds the status)
// and the parsed JSON is already in response.data
export async function getWithAxios(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`Request failed with status ${error.response.status}`);
    }
    throw new Error(`Network error: ${error.message}`);
  }
}
