/* ================================================================
   VendorBridge — API Client (fetch wrapper)
   ================================================================ */

const API_BASE = 'http://localhost:5000/api';

const api = {
  _getHeaders() {
    const token = localStorage.getItem('vb_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  },

  async _request(method, endpoint, body = null) {
    const url = `${API_BASE}${endpoint}`;
    const options = {
      method,
      headers: this._getHeaders(),
    };
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(url, options);

      // Handle 401 — token expired
      if (res.status === 401) {
        localStorage.removeItem('vb_token');
        localStorage.removeItem('vb_user');
        window.location.hash = '#/login';
        return null;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new APIError(data.error || 'Request failed', res.status, data);
      }

      return data;
    } catch (err) {
      if (err instanceof APIError) throw err;
      throw new APIError('Network error — is the backend running?', 0);
    }
  },

  get:    (endpoint) => api._request('GET', endpoint),
  post:   (endpoint, body) => api._request('POST', endpoint, body),
  put:    (endpoint, body) => api._request('PUT', endpoint, body),
  delete: (endpoint) => api._request('DELETE', endpoint),

  // Auth
  auth: {
    login:   (data) => api.post('/auth/login', data),
    register:(data) => api.post('/auth/register', data),
    me:      ()     => api.get('/auth/me'),
  },

  // Vendors
  vendors: {
    list:   (params = '') => api.get(`/vendors/${params}`),
    get:    (id) => api.get(`/vendors/${id}`),
    create: (data) => api.post('/vendors/', data),
    update: (id, data) => api.put(`/vendors/${id}`, data),
    delete: (id) => api.delete(`/vendors/${id}`),
    stats:  () => api.get('/vendors/stats'),
    categories: () => api.get('/vendors/categories'),
  },

  // RFQs
  rfqs: {
    list:   (params = '') => api.get(`/rfqs/${params}`),
    get:    (id) => api.get(`/rfqs/${id}`),
    create: (data) => api.post('/rfqs/', data),
    update: (id, data) => api.put(`/rfqs/${id}`, data),
    delete: (id) => api.delete(`/rfqs/${id}`),
    stats:  () => api.get('/rfqs/stats'),
  },

  // Quotations
  quotations: {
    list:    (params = '') => api.get(`/quotations/${params}`),
    get:     (id) => api.get(`/quotations/${id}`),
    create:  (data) => api.post('/quotations/', data),
    update:  (id, data) => api.put(`/quotations/${id}`, data),
    delete:  (id) => api.delete(`/quotations/${id}`),
    compare: (rfqId) => api.get(`/quotations/compare/${rfqId}`),
  },

  // Approvals
  approvals: {
    list:   (params = '') => api.get(`/approvals/${params}`),
    get:    (id) => api.get(`/approvals/${id}`),
    create: (data) => api.post('/approvals/', data),
    approve:(id, data) => api.put(`/approvals/${id}/approve`, data),
    reject: (id, data) => api.put(`/approvals/${id}/reject`, data),
    stats:  () => api.get('/approvals/stats'),
  },

  // Purchase Orders
  purchaseOrders: {
    list:   (params = '') => api.get(`/purchase-orders/${params}`),
    get:    (id) => api.get(`/purchase-orders/${id}`),
    create: (data) => api.post('/purchase-orders/', data),
    update: (id, data) => api.put(`/purchase-orders/${id}`, data),
    stats:  () => api.get('/purchase-orders/stats'),
  },

  // Invoices
  invoices: {
    list:     (params = '') => api.get(`/invoices/${params}`),
    get:      (id) => api.get(`/invoices/${id}`),
    generate: (data) => api.post('/invoices/', data),
    email:    (id) => api.post(`/invoices/${id}/email`, {}),
    status:   (id, status) => api.put(`/invoices/${id}/status`, { status }),
    downloadUrl: (id) => `${API_BASE}/invoices/${id}/download`,
    stats:    () => api.get('/invoices/stats'),
  },

  // Reports
  reports: {
    dashboard:   () => api.get('/reports/dashboard'),
    monthlySpend:(year) => api.get(`/reports/monthly-spend?year=${year}`),
    topVendors:  () => api.get('/reports/top-vendors'),
    categorySpend: () => api.get('/reports/category-spend'),
    approvalRate: () => api.get('/reports/approval-rate'),
    vendorPerformance: () => api.get('/reports/vendor-performance'),
  },

  // Activity Logs
  activityLogs: {
    list: (params = '') => api.get(`/activity-logs/${params}`),
  },
};

class APIError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

window.api = api;
window.APIError = APIError;
