import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Attach JWT token if present
const getToken = () => localStorage.getItem('ft_token');
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Legacy API token support
  const apiToken = import.meta.env.VITE_API_TOKEN;
  if (apiToken) {
    config.headers['x-api-token'] = apiToken;
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes('/auth/')) {
      localStorage.removeItem('ft_token');
      localStorage.removeItem('ft_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const auth = {
  status: () => api.get('/auth/status'),
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const transactions = {
  getAll: (params) => api.get('/transactions', { params }),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  import: (data) => api.post('/transactions/import', data),
};

export const budgets = {
  getAll: (params) => api.get('/budgets', { params }),
  create: (data) => api.post('/budgets', data),
  delete: (id) => api.delete(`/budgets/${id}`),
};

export const stats = {
  getSummary: (params) => api.get('/stats/summary', { params }),
  getByCategory: (params) => api.get('/stats/by-category', { params }),
  getMonthly: () => api.get('/stats/monthly'),
  getRecent: (params) => api.get('/stats/recent', { params }),
};

export const recurring = {
  getAll: () => api.get('/recurring'),
  create: (data) => api.post('/recurring', data),
  delete: (id) => api.delete(`/recurring/${id}`),
  generate: (month) => api.post('/recurring/generate', { month }),
};

export const ai = {
  status: () => api.get('/ai/status'),
  analyze: (transactions) => api.post('/ai/analyze', { transactions }),
  suggest: (data) => api.post('/ai/suggest', data),
  apply: (updates) => api.post('/ai/apply', { updates }),
};

export default api;
