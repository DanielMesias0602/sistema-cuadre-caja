import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/cuadrecaja/api';
const AUTH_TOKEN_KEY = 'finito_auth_token';
const AUTH_USER_KEY = 'finito_auth_user';

export const authService = {
  async login(username, password) {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username,
      password,
    });

    if (response.data && response.data.status === 'ok' && response.data.data) {
      const { token, user } = response.data.data;
      if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
      }
      if (user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      }
      return response.data.data;
    }

    throw new Error(response.data?.message || 'Error al iniciar sesión');
  },

  async getCurrentUser() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await axios.get(`${BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data && response.data.status === 'ok' && response.data.data) {
        return response.data.data;
      }
      this.logout();
      return null;
    } catch {
      this.logout();
      return null;
    }
  },

  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  },

  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  getStoredUser() {
    const userStr = localStorage.getItem(AUTH_USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },
};
