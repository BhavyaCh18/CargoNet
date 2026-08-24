import { CONFIG } from './config.js';

export const API = {
  getToken() {
    return localStorage.getItem('cargonet_jwt');
  },

  setToken(token) {
    localStorage.setItem('cargonet_jwt', token);
  },

  clearAuth() {
    localStorage.removeItem('cargonet_jwt');
    localStorage.removeItem('cargonet_user');
  },

  getUser() {
    const userStr = localStorage.getItem('cargonet_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  setUser(user) {
    localStorage.setItem('cargonet_user', JSON.stringify(user));
  },

  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401) {
        this.clearAuth();
        if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('index.html')) {
          window.location.href = 'login.html';
        }
      }

      const contentType = response.headers.get('content-type') || '';
      let data;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`API returned HTTP ${response.status} for ${endpoint}: ${text.substring(0, 150)}`);
        }
        throw new Error(`API returned non-JSON response (${contentType}) for ${endpoint}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  sendOTP(email, purpose) {
    return this.post('/auth/send-otp', { email, purpose });
  },

  verifyOTP(email, otp, purpose) {
    return this.post('/auth/verify-otp', { email, otp, purpose });
  },

  resetPassword(email, verificationToken, newPassword) {
    return this.post('/auth/reset-password', { email, verificationToken, newPassword });
  },

  googleAuth(idToken) {
    return this.post('/auth/google', { idToken });
  },

  completeGoogleRegistration(onboardingToken, role) {
    return this.post('/auth/google', { onboardingToken, role });
  }
};
