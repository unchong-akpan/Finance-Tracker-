import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export const transactions = {
  getAll: (params) => api.get('/transactions', { params }),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
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

export default api;
