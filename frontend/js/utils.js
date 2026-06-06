/* ================================================================
   VendorBridge — Utility Helpers
   ================================================================ */

const Utils = {
  /* ── Formatting ─────────────────────────────────── */
  currency(amount, symbol = '₹') {
    if (amount == null) return `${symbol}0.00`;
    return `${symbol}${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  date(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  datetime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  timeAgo(iso) {
    if (!iso) return '';
    const seconds = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (seconds < 60)   return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds/60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds/3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds/86400)}d ago`;
    return Utils.date(iso);
  },

  /* ── Status helpers ──────────────────────────────── */
  statusBadge(status) {
    const map = {
      active: 'badge-green', inactive: 'badge-gray',
      blacklisted: 'badge-red', pending: 'badge-yellow',
      draft: 'badge-gray', published: 'badge-blue',
      closed: 'badge-brown', cancelled: 'badge-red', awarded: 'badge-green',
      submitted: 'badge-blue', under_review: 'badge-yellow',
      shortlisted: 'badge-purple', rejected: 'badge-red', accepted: 'badge-green',
      approved: 'badge-green',
      issued: 'badge-blue', acknowledged: 'badge-purple',
      in_progress: 'badge-yellow', delivered: 'badge-green',
      generated: 'badge-blue', sent: 'badge-purple',
      paid: 'badge-green', overdue: 'badge-red',
      revision_requested: 'badge-yellow',
    };
    const cls = map[status] || 'badge-gray';
    const label = status ? status.replace(/_/g, ' ') : 'unknown';
    return `<span class="badge ${cls}">${label}</span>`;
  },

  stars(rating) {
    const r = parseFloat(rating) || 0;
    const full = Math.floor(r);
    const half = r - full >= 0.5;
    let html = '';
    for (let i = 0; i < full; i++) html += '★';
    if (half) html += '½';
    for (let i = full + (half ? 1 : 0); i < 5; i++) html += '☆';
    return `<span class="stars" title="${r}/5">${html}</span>`;
  },

  moduleChipColor(module) {
    const map = {
      auth: '#2563eb', vendors: '#16a34a', rfqs: '#7c3aed',
      quotations: '#f59e0b', approvals: '#dc2626',
      purchase_orders: '#0891b2', invoices: '#674636',
      reports: '#94a3b8',
    };
    return map[module] || '#64748b';
  },

  /* ── DOM Helpers ─────────────────────────────────── */
  el(selector) { return document.querySelector(selector); },
  els(selector) { return document.querySelectorAll(selector); },

  html(el, content) {
    const target = typeof el === 'string' ? document.querySelector(el) : el;
    if (target) target.innerHTML = content;
  },

  empty(el) {
    const target = typeof el === 'string' ? document.querySelector(el) : el;
    if (target) target.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';
  },

  /* ── Escape HTML ─────────────────────────────────── */
  escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  /* ── Form helpers ────────────────────────────────── */
  getFormData(formEl) {
    const data = {};
    const fd = new FormData(formEl);
    for (const [k, v] of fd.entries()) {
      data[k] = v.trim ? v.trim() : v;
    }
    return data;
  },

  setFormData(formEl, data) {
    Object.entries(data).forEach(([k, v]) => {
      const el = formEl.elements[k];
      if (el && v != null) el.value = v;
    });
  },

  showLoading(btn, text = 'Loading...') {
    if (!btn) return;
    btn._origText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span> ${text}`;
  },

  hideLoading(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = btn._origText || 'Submit';
  },

  /* ── Debounce ────────────────────────────────────── */
  debounce(fn, delay = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  },

  /* ── Table no-data ───────────────────────────────── */
  emptyRow(cols, msg = 'No records found') {
    return `<tr><td colspan="${cols}" style="text-align:center; padding:40px; color:var(--clr-text-muted);">
      <div style="font-size:32px;margin-bottom:8px;">📭</div>${msg}</td></tr>`;
  },
};

window.Utils = Utils;
