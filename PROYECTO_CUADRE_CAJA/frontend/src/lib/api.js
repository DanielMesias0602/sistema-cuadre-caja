import axios from 'axios';

const AUTH_TOKEN_KEY = 'finito_auth_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/cuadrecaja/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const esLogin = url.includes('/auth/login');

    if (error.response?.status === 401 && !esLogin) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem('finito_auth_user');
      window.location.href = `${import.meta.env.BASE_URL}login`;
    }
    return Promise.reject(error);
  }
);

export default api;
