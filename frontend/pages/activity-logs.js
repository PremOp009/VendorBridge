/* ================================================================
   VendorBridge — Activity Logs Page
   ================================================================ */

Pages.activityLogs = {
  _page: 1,

  async render() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Activity Logs</h1>
        <p>Complete audit trail of all system activities</p>
      </div>
      <button class="btn btn-secondary" onclick="Pages.activityLogs.loadLogs()">🔄 Refresh</button>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <select class="form-select" id="log-module-filter" style="width:180px;">
        <option value="">All Modules</option>
        <option value="auth">Authentication</option>
        <option value="vendors">Vendors</option>
        <option value="rfqs">RFQs</option>
        <option value="quotations">Quotations</option>
        <option value="approvals">Approvals</option>
        <option value="purchase_orders">Purchase Orders</option>
        <option value="invoices">Invoices</option>
      </select>
    </div>

    <div class="card">
      <div id="logs-content"></div>
      <div id="logs-pagination" class="pagination" style="margin-top:0;padding-top:16px;border-top:1px solid var(--clr-border);"></div>
    </div>
    `;

    await this.loadLogs();
    document.getElementById('log-module-filter')?.addEventListener('change', () => { this._page = 1; this.loadLogs(); });
  },

  async loadLogs() {
    const module = document.getElementById('log-module-filter')?.value || '';
    const params = `?page=${this._page}&per_page=30${module?`&module=${module}`:''}`;
    const content = document.getElementById('logs-content');
    content.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';

    try {
      const res = await api.activityLogs.list(params);
      const logs = res?.data?.logs || [];
      const data = res?.data || {};

      if (!logs.length) {
        content.innerHTML = `<div class="empty-state">
          <div class="empty-state-icon">🔔</div>
          <h3>No activity logs</h3>
          <p>System activities will be logged here as you use VendorBridge</p>
        </div>`;
        document.getElementById('logs-pagination').innerHTML = '';
        return;
      }

      content.innerHTML = logs.map(log => `
        <div class="log-item">
          <div class="log-dot" style="background:${Utils.moduleChipColor(log.module)};"></div>
          <div class="log-content">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px;">
              <strong class="log-action">${Utils.escape(log.action.replace(/_/g,' '))}</strong>
              <span class="module-chip" style="background:${Utils.moduleChipColor(log.module)}22;color:${Utils.moduleChipColor(log.module)};">
                ${log.module}
              </span>
            </div>
            <div class="log-desc">${Utils.escape(log.description || '')}</div>
            <div class="log-time">
              👤 ${Utils.escape(log.user_name || 'System')} •
              📅 ${Utils.datetime(log.created_at)}
              ${log.ip_address ? ` • 🌐 ${log.ip_address}` : ''}
            </div>
          </div>
        </div>
      `).join('');

      // Pagination
      const pg = document.getElementById('logs-pagination');
      if (data.pages > 1) {
        pg.innerHTML = `
          <button class="pagination-btn" ${this._page<=1?'disabled':''} onclick="Pages.activityLogs._page--;Pages.activityLogs.loadLogs()">‹ Prev</button>
          <span style="font-size:13px;color:var(--clr-text-secondary);">Page ${this._page} of ${data.pages} (${data.total} entries)</span>
          <button class="pagination-btn" ${this._page>=data.pages?'disabled':''} onclick="Pages.activityLogs._page++;Pages.activityLogs.loadLogs()">Next ›</button>
        `;
      } else {
        pg.innerHTML = `<span style="font-size:12px;color:var(--clr-text-muted);">${data.total || logs.length} entries</span>`;
      }
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>${err.message}</h3></div>`;
    }
  }
};
