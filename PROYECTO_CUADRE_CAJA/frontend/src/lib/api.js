import axios from 'axios';
import { notifyToast } from '../components/ui/toastEvents';

const AUTH_TOKEN_KEY = 'finito_auth_token';
const API_BASE_URL = import.meta.env.DEV ? '/api' : '/cuadrecaja/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
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
    const status = error.response?.status;

    if (status === 401 && !esLogin) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem('finito_auth_user');
      window.location.href = `${import.meta.env.BASE_URL}login`;
    } else if (status >= 400) {
      const message = error.response?.data?.message || `La solicitud falló (${status}).`;
      notifyToast(message, 'error');
    } else if (error.code !== 'ERR_CANCELED' && !error.response) {
      notifyToast('No se pudo conectar con el servidor. Inténtalo nuevamente.', 'error');
    }
    return Promise.reject(error);
  }
);

export default api;
