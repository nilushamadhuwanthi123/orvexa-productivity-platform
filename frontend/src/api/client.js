import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 20000,
});

let accessToken = null;
let onUnauthorized = () => {};

export const setAccessToken = (token) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Single-flight refresh: concurrent 401s wait on one refresh call.
let refreshPromise = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && original && !original._retried && !original.url?.includes('/auth/')) {
      original._retried = true;
      try {
        refreshPromise =
          refreshPromise ||
          api.post('/auth/refresh').finally(() => {
            refreshPromise = null;
          });
        const { data } = await refreshPromise;
        accessToken = data.data.accessToken;
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        accessToken = null;
        onUnauthorized();
        return Promise.reject(error);
      }
    }

    // Normalise the error shape so UI code has one thing to read.
    error.message =
      error.response?.data?.error?.message ||
      (error.code === 'ERR_NETWORK'
        ? 'Cannot reach the server. Check that the API is running.'
        : error.message);
    error.details = error.response?.data?.error?.details;

    return Promise.reject(error);
  }
);

export default api;
